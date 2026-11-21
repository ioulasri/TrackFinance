"""OAuth redirects, provider exchanges and account linking without external calls."""
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from jose import jwt

from app.db.config import settings
from app.models.user import User
from app.services import oauth_service
from app.services.oauth_service import OAuthService


@pytest.fixture(autouse=True)
def oauth_config(monkeypatch):
    for provider in ("GOOGLE", "DISCORD"):
        monkeypatch.setattr(oauth_service, f"{provider}_CLIENT_ID", "test-client")
        monkeypatch.setattr(oauth_service, f"{provider}_CLIENT_SECRET", "test-secret")
    monkeypatch.setattr("app.api.routes.users.BACKEND_URL", "http://testserver")


def start_login(client, provider):
    response = client.get(f"/v1/users/oauth/{provider}", follow_redirects=False)
    assert response.status_code == 307
    params = parse_qs(urlparse(response.headers["location"]).query)
    assert params["client_id"] == ["test-client"]
    assert params["redirect_uri"][0].endswith(f"/v1/users/oauth/{provider}/callback")
    assert "test-secret" not in response.headers["location"]
    return params["state"][0]


def mock_provider(monkeypatch, provider, *, profile=None, failure=None):
    profile = profile if profile is not None else {
        "id": "provider-123", "email": "Person@Example.com", "name": "New User",
        "username": "new_user", "verified_email": True, "verified": True,
        "picture": "https://example.com/avatar.png", "avatar": "avatar-hash",
    }
    requests = []

    def handle(request):
        requests.append(request)
        if request.method == "POST":
            data = parse_qs(request.content.decode())
            assert data["code"] == ["auth-code"]
            assert data["client_secret"] == ["test-secret"]
            assert data["redirect_uri"][0].endswith(f"/v1/users/oauth/{provider}/callback")
            if failure == "timeout":
                raise httpx.ReadTimeout("secret-provider-body", request=request)
            if failure == "rejected_token":
                return httpx.Response(400, json={"error": "invalid_grant", "error_description": "secret-provider-body"})
            if failure == "malformed_token":
                return httpx.Response(200, text="secret-provider-body")
            return httpx.Response(200, json={} if failure == "missing_token" else {"access_token": "provider-access-token"})
        assert request.headers["Authorization"] == "Bearer provider-access-token"
        return httpx.Response(503 if failure == "profile_error" else 200, json=profile)

    original_client = httpx.AsyncClient
    monkeypatch.setattr(oauth_service.httpx, "AsyncClient", lambda **kwargs: original_client(
        transport=httpx.MockTransport(handle), **kwargs,
    ))
    return requests


def callback(client, provider, state, **params):
    return client.get(f"/v1/users/oauth/{provider}/callback", params={"state": state, **params}, follow_redirects=False)


def error_code(response):
    assert response.status_code == 307
    assert not urlparse(response.headers["location"]).fragment
    return parse_qs(urlparse(response.headers["location"]).query)["error"][0]


@pytest.mark.parametrize("provider", ["google", "discord"])
def test_login_creates_account_and_returns_working_session(client, db_session, monkeypatch, provider):
    requests = mock_provider(monkeypatch, provider)
    response = callback(client, provider, start_login(client, provider), code="auth-code")
    location = urlparse(response.headers["location"])
    assert location.path == "/oauth-callback"
    assert not location.query  # Login token stays out of frontend HTTP request logs.
    token = parse_qs(location.fragment)["token"][0]
    user = db_session.query(User).one()
    assert user.email == "person@example.com"
    assert user.is_verified and user.hashed_password is None
    assert user.oauth_provider == provider and user.oauth_id == "provider-123"
    me = client.get("/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["id"] == user.id
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "Max-Age=0" in response.headers["set-cookie"]
    assert len(requests) == 2
    callback(client, provider, start_login(client, provider), code="auth-code")
    assert db_session.query(User).count() == 1


@pytest.mark.parametrize("provider", ["google", "discord"])
def test_existing_password_account_is_preserved(client, db_session, test_user, monkeypatch, provider):
    user_id, password_hash = test_user.id, test_user.hashed_password
    test_user.email = "Person@Example.com"
    test_user.verification_token = "old-verification"
    db_session.commit()
    mock_provider(monkeypatch, provider)
    response = callback(client, provider, start_login(client, provider), code="auth-code")
    assert "token=" in urlparse(response.headers["location"]).fragment
    user = db_session.query(User).one()
    assert user.id == user_id and user.hashed_password == password_hash
    assert user.verification_token is None and user.is_verified


def test_both_providers_share_same_verified_email_account(client, db_session, monkeypatch):
    for provider in ("google", "discord", "google"):
        with monkeypatch.context() as patch:
            mock_provider(patch, provider)
            response = callback(client, provider, start_login(client, provider), code="auth-code")
            assert "token=" in urlparse(response.headers["location"]).fragment
    assert db_session.query(User).count() == 1


@pytest.mark.parametrize("provider", ["google", "discord"])
@pytest.mark.parametrize("missing", ["CLIENT_ID", "CLIENT_SECRET"])
def test_missing_credentials_return_clear_error(client, monkeypatch, provider, missing):
    monkeypatch.setattr(oauth_service, f"{provider.upper()}_{missing}", "")
    response = client.get(f"/v1/users/oauth/{provider}", follow_redirects=False)
    assert error_code(response) == f"{provider}_not_configured"


@pytest.mark.parametrize("provider", ["google", "discord"])
@pytest.mark.parametrize("failure", ["no_cookie", "mismatch", "expired", "tampered", "wrong_provider"])
def test_invalid_state_never_exchanges_code(client, monkeypatch, provider, failure):
    requests = mock_provider(monkeypatch, provider)
    state = start_login(client, provider)
    if failure == "no_cookie":
        client.cookies.clear()
    elif failure == "mismatch":
        state = "wrong-state"
    else:
        client.cookies.clear()
        if failure == "expired":
            cookie = jwt.encode({
                "purpose": "oauth_state", "provider": provider, "nonce": state,
                "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
            }, settings.secret_key, algorithm=settings.algorithm)
        elif failure == "wrong_provider":
            state, cookie = OAuthService.create_state("discord" if provider == "google" else "google")
        else:
            cookie = "bad-cookie"
        client.cookies.set(f"tf_oauth_{provider}", cookie)
    assert error_code(callback(client, provider, state, code="auth-code")) == "invalid_state"
    assert requests == []


@pytest.mark.parametrize("provider", ["google", "discord"])
@pytest.mark.parametrize("params,expected", [
    ({"error": "access_denied"}, "access_denied"), ({}, "missing_code"),
    ({"code": "auth-code", "iss": "https://wrong.example"}, "invalid_state"),
])
def test_cancelled_or_incomplete_login_returns_to_frontend(client, provider, params, expected):
    assert error_code(callback(client, provider, start_login(client, provider), **params)) == expected


@pytest.mark.parametrize("provider", ["google", "discord"])
@pytest.mark.parametrize("failure", ["unverified", "missing_email", "missing_id"])
def test_incomplete_identity_cannot_create_account(client, db_session, monkeypatch, provider, failure):
    profile = {"id": "123", "email": "test@example.com", "verified_email": True, "verified": True}
    if failure == "unverified":
        profile.update(verified_email=False, verified=False)
    else:
        profile.pop("email" if failure == "missing_email" else "id")
    mock_provider(monkeypatch, provider, profile=profile)
    response = callback(client, provider, start_login(client, provider), code="auth-code")
    assert error_code(response) == {
        "unverified": "email_not_verified", "missing_email": "email_required", "missing_id": "provider_error",
    }[failure]
    assert db_session.query(User).count() == 0


@pytest.mark.parametrize("provider", ["google", "discord"])
@pytest.mark.parametrize("failure", ["rejected_token", "malformed_token", "missing_token", "timeout", "profile_error"])
def test_provider_failure_does_not_leak_secrets(client, db_session, monkeypatch, caplog, provider, failure):
    mock_provider(monkeypatch, provider, failure=failure)
    response = callback(client, provider, start_login(client, provider), code="auth-code")
    assert error_code(response) == "provider_error"
    assert db_session.query(User).count() == 0
    for secret in ("test-secret", "secret-provider-body", "provider-access-token"):
        assert secret not in response.headers["location"] and secret not in caplog.text


def test_production_cookie_flags(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.users.BACKEND_URL", "https://api.example.com")
    response = client.get("/v1/users/oauth/google", follow_redirects=False)
    cookie = response.headers["set-cookie"]
    for flag in ("HttpOnly", "Secure", "SameSite=lax", "Max-Age=600", "Path=/v1/users/oauth/google/callback"):
        assert flag in cookie
