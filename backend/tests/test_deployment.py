"""Deployment contracts: protected jobs, durable Telegram state, and S3 uploads."""

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from io import BytesIO
from unittest.mock import Mock

from fastapi import UploadFile
import pytest
from starlette.datastructures import Headers

from app.models.recurring_transaction import RecurringTransaction
from app.models.telegram_state import TelegramState
from app.models.transaction import Transaction
from app.services import scheduler_service, telegram_service, telegram_state_service
from app.services.avatar_service import AvatarService, MAX_AVATAR_BYTES, StorageConfig, get_storage_config
from tests.conftest import TestingSessionLocal


def test_jobs_fail_closed_when_secret_is_missing(client, monkeypatch):
    monkeypatch.delenv("CRON_SECRET", raising=False)
    assert client.post("/internal/jobs/hourly").status_code == 503


@pytest.mark.parametrize("authorization", [None, "Bearer wrong", "secret", b"Bearer s\xe9cret"])
def test_job_credentials_are_required(client, monkeypatch, authorization):
    monkeypatch.setenv("CRON_SECRET", "secret")
    headers = {"Authorization": authorization} if authorization else {}
    assert client.post("/internal/jobs/hourly", headers=headers).status_code == 401


def test_hourly_job_posts_due_transaction_once(client, db_session, test_user, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "test-secret")
    monkeypatch.setattr(scheduler_service.recurring_service, "notify_recurring_applied", lambda *args: None)
    row = RecurringTransaction(
        user_id=test_user.id, amount=100, type="income", category="Salary", day_of_month=1,
        next_run_date=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db_session.add(row)
    db_session.commit()
    headers = {"Authorization": "Bearer test-secret"}
    first = client.post("/internal/jobs/hourly", headers=headers)
    second = client.post("/internal/jobs/hourly", headers=headers)
    assert first.status_code == second.status_code == 200
    assert first.json()["recurring_applied"] == 1
    assert second.json()["recurring_applied"] == 0
    assert db_session.query(Transaction).count() == 1


def test_weekly_digest_endpoint(client, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "secret")
    monkeypatch.setattr(scheduler_service.digest_service, "send_weekly_digests", lambda db: 3)
    response = client.post("/internal/jobs/weekly-digest", headers={"Authorization": "Bearer secret"})
    assert response.json()["digests_sent"] == 3


def test_job_errors_return_failure_for_monitoring(client, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "secret")
    def fail(db):
        raise RuntimeError("private database details")
    monkeypatch.setattr(scheduler_service.digest_service, "send_weekly_digests", fail)
    response = client.post("/internal/jobs/weekly-digest", headers={"Authorization": "Bearer secret"})
    assert response.status_code == 500
    assert "private database details" not in response.text


def test_overlapping_job_is_skipped(db_session, monkeypatch):
    @contextmanager
    def busy(db):
        yield False
    monkeypatch.setattr(scheduler_service, "_job_lock", busy)
    assert "skipped" in scheduler_service.run_job(db_session, "hourly")


def test_unknown_jobs_and_get_requests_are_rejected(client, monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "secret")
    assert client.post("/internal/jobs/invalid", headers={"Authorization": "Bearer secret"}).status_code == 404
    assert client.get("/internal/jobs/hourly").status_code == 405


def test_vercel_never_starts_background_scheduler(monkeypatch):
    monkeypatch.delenv("TESTING", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setattr(scheduler_service, "_scheduler", None)
    assert scheduler_service.start_scheduler() is None


def test_cors_only_accepts_configured_frontend(client):
    headers = {"Access-Control-Request-Method": "POST", "Origin": "http://localhost:3000"}
    assert client.options("/v1/users/login", headers=headers).status_code == 200
    headers["Origin"] = "https://untrusted.example"
    response = client.options("/v1/users/login", headers=headers)
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_telegram_state_survives_memory_loss_and_expires(db_session, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setattr(telegram_state_service, "SessionLocal", TestingSessionLocal)
    telegram_service.set_wizard("123", "addtx", "amount", {"type": "expense"})
    telegram_service._WIZARDS.clear()
    telegram_service.update_wizard_data("123", amount=50)
    telegram_service.set_wizard_step("123", "confirm")
    state = telegram_service.get_wizard("123")
    assert state["step"] == "confirm" and state["data"]["amount"] == 50
    telegram_service.update_history(7, [{"role": "user", "content": "hello"}])
    telegram_service._HISTORY.clear()
    assert telegram_service.get_history(7)[0]["content"] == "hello"
    db_session.query(TelegramState).update({"expires_at": 0})
    db_session.commit()
    assert telegram_service.get_wizard("123") is None
    assert telegram_service.get_history(7) == []


def test_expired_telegram_data_is_cleaned_by_hourly_job(db_session, monkeypatch):
    db_session.add(TelegramState(key="expired", payload={}, expires_at=0))
    db_session.commit()
    scheduler_service.run_job(db_session, "hourly")
    assert db_session.get(TelegramState, "expired") is None


def test_failed_recurring_transaction_rolls_back_all_changes(db_session, test_user, monkeypatch):
    from app.services.budget_service import BudgetService
    row = RecurringTransaction(
        user_id=test_user.id, amount=100, type="expense", category="Food", day_of_month=1,
        next_run_date=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db_session.add(row)
    db_session.commit()
    original_xp = test_user.total_xp
    def fail(*args, **kwargs):
        raise RuntimeError("interrupted before advancing schedule")
    monkeypatch.setattr(BudgetService, "update_spent_amount", fail)
    with pytest.raises(RuntimeError):
        scheduler_service.run_job(db_session, "hourly")
    assert db_session.query(Transaction).count() == 0
    db_session.refresh(test_user)
    db_session.refresh(row)
    assert test_user.total_xp == original_xp
    assert row.last_run_at is None


@pytest.fixture
def storage(monkeypatch):
    for key, value in {
        "AVATAR_STORAGE_PROVIDER": "supabase", "SUPABASE_URL": "https://example.supabase.co",
        "SUPABASE_STORAGE_REGION": "eu-central-1", "SUPABASE_STORAGE_BUCKET": "avatars",
        "SUPABASE_S3_ACCESS_KEY_ID": "test-key", "SUPABASE_S3_SECRET_ACCESS_KEY": "test-secret",
    }.items():
        monkeypatch.setenv(key, value)
    client = Mock()
    monkeypatch.setattr(AvatarService, "get_client", staticmethod(lambda *args: client))
    return client


@pytest.mark.asyncio
async def test_supabase_avatar_upload_omits_unsupported_acl(storage):
    upload = UploadFile(filename="photo.png", file=BytesIO(b"image"), headers=Headers({"content-type": "image/png"}))
    url = await AvatarService.upload_avatar(upload, 42)
    assert url.startswith("https://example.supabase.co/storage/v1/object/public/avatars/avatars/42/")
    assert "ACL" not in storage.put_object.call_args.kwargs
    assert storage.put_object.call_args.kwargs["ContentType"] == "image/png"


@pytest.mark.asyncio
async def test_oversized_avatar_is_rejected_without_storage_write(storage):
    upload = UploadFile(filename="photo.png", file=BytesIO(b"x" * (MAX_AVATAR_BYTES + 1)), headers=Headers({"content-type": "image/png"}))
    with pytest.raises(ValueError, match="4 MB"):
        await AvatarService.upload_avatar(upload, 42)
    storage.put_object.assert_not_called()


def test_avatar_deletion_cannot_target_external_urls(storage):
    AvatarService.delete_avatar("https://untrusted.example/avatars/42/photo.png")
    storage.delete_object.assert_not_called()
    config = get_storage_config()
    AvatarService.delete_avatar(config.public_url + "/avatars/42/photo.png")
    storage.delete_object.assert_called_once_with(Bucket="avatars", Key="avatars/42/photo.png")


def test_failed_avatar_upload_preserves_existing_avatar(client, db_session, test_user, auth_headers, storage):
    old_url = "https://example.supabase.co/storage/v1/object/public/avatars/avatars/1/old.png"
    test_user.avatar_url = old_url
    db_session.commit()
    storage.put_object.side_effect = RuntimeError("storage unavailable")
    response = client.post("/v1/users/me/avatar", headers=auth_headers, files={"file": ("photo.png", b"image", "image/png")})
    assert response.status_code == 500
    assert test_user.avatar_url == old_url
    storage.delete_object.assert_not_called()


@pytest.mark.parametrize("upload_fails", [False, True])
def test_avatar_migration_is_resumable_and_preserves_originals(db_session, test_user, monkeypatch, upload_fails):
    from app.scripts import migrate_avatars
    source = StorageConfig("digitalocean", "https://nyc3.digitaloceanspaces.com", "nyc3", "old", "key", "secret", "https://old.nyc3.digitaloceanspaces.com")
    target = StorageConfig("supabase", "https://example.supabase.co/storage/v1/s3", "eu-central-1", "avatars", "key", "secret", "https://example.supabase.co/storage/v1/object/public/avatars")
    original_url = source.public_url + "/avatars/1/photo.png"
    test_user.avatar_url = original_url
    db_session.commit()
    source_client, target_client = Mock(), Mock()
    source_client.get_object.return_value = {"Body": BytesIO(b"image"), "ContentType": "image/png"}
    if upload_fails:
        target_client.put_object.side_effect = RuntimeError("unavailable")
    monkeypatch.setattr(migrate_avatars, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(migrate_avatars, "get_storage_config", lambda provider: source if provider == "digitalocean" else target)
    monkeypatch.setattr(AvatarService, "get_client", staticmethod(lambda config: source_client if config == source else target_client))
    monkeypatch.setattr("sys.argv", ["migrate_avatars"])
    assert migrate_avatars.main() == 0  # Dry-run neither copies nor updates URLs.
    db_session.refresh(test_user)
    assert test_user.avatar_url == original_url
    target_client.put_object.assert_not_called()
    monkeypatch.setattr("sys.argv", ["migrate_avatars", "--apply"])
    assert migrate_avatars.main() == (1 if upload_fails else 0)
    db_session.refresh(test_user)
    if upload_fails:
        assert test_user.avatar_url == original_url
    else:
        assert test_user.avatar_url == target.public_url + "/avatars/1/photo.png"
        assert migrate_avatars.main() == 0
        target_client.put_object.assert_called_once()
    source_client.delete_object.assert_not_called()
