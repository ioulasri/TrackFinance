"""
Unit tests for the new "fun & useful" feature set:
- Recurring transactions (process_due, monthly advance, clamp to month-end)
- Budget alerts (threshold crossing and idempotency)
- Weekly digest (build + dedupe)

Telegram I/O is monkey-patched; no network.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.models.budget import Budget
from app.models.recurring_transaction import RecurringTransaction
from app.models.transaction import Transaction
from app.schemas.recurring import RecurringTransactionCreate
from app.services import budget_alerts, digest_service, notification_service, recurring_service
from app.services.recurring_service import RecurringTransactionService, _compute_next_run


@pytest.fixture(autouse=True)
def _stub_telegram(monkeypatch):
	"""Stub outbound Telegram DMs so notification_service.notify is a no-op."""
	monkeypatch.setattr(
		"app.services.telegram_service.TelegramService.send_message",
		staticmethod(lambda *a, **k: {"ok": True}),
	)
	yield


# ──────────────────────────────────────────────────────────────────
# _compute_next_run
# ──────────────────────────────────────────────────────────────────

class TestComputeNextRun:
	def test_advances_when_today_is_past_target(self):
		# today is Jan 15; target day = 1 → next run is Feb 1
		after = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc)
		nxt = _compute_next_run(after, 1)
		assert nxt.year == 2026 and nxt.month == 2 and nxt.day == 1

	def test_same_month_when_target_is_future(self):
		# today is Jan 5; target day = 20 → Jan 20
		after = datetime(2026, 1, 5, 12, 0, tzinfo=timezone.utc)
		nxt = _compute_next_run(after, 20)
		assert nxt.year == 2026 and nxt.month == 1 and nxt.day == 20

	def test_clamps_to_short_month(self):
		# Day 31 in a 28-day February → Feb 28
		after = datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc)
		nxt = _compute_next_run(after, 31)
		assert nxt.year == 2026 and nxt.month == 2 and nxt.day == 28

	def test_year_rollover(self):
		# Dec 20, target day 5 → Jan 5 of next year
		after = datetime(2026, 12, 20, 12, 0, tzinfo=timezone.utc)
		nxt = _compute_next_run(after, 5)
		assert nxt.year == 2027 and nxt.month == 1 and nxt.day == 5


# ──────────────────────────────────────────────────────────────────
# RecurringTransactionService.process_due
# ──────────────────────────────────────────────────────────────────

class TestProcessDue:
	def _make(self, db, user, day=1, amount=5000, type="income"):
		return RecurringTransactionService.create(
			db, user.id,
			RecurringTransactionCreate(
				amount=amount, type=type, category="Salary",
				description="Test recurring", day_of_month=day,
			),
		)

	def test_creates_transaction_when_due(self, db_session, test_user):
		r = self._make(db_session, test_user, day=1)
		# Force it due now.
		r.next_run_date = datetime.now(timezone.utc) - timedelta(minutes=1)
		db_session.commit()

		applied = RecurringTransactionService.process_due(db_session)
		assert len(applied) == 1
		recurring, tx = applied[0]
		assert recurring.id == r.id
		assert tx.user_id == test_user.id
		assert float(tx.amount) == 5000.0
		assert tx.category == "Salary"
		# Recurring should be advanced. SQLite drops tz; coerce both sides to naive UTC.
		db_session.refresh(r)
		nrd = r.next_run_date.replace(tzinfo=None) if r.next_run_date.tzinfo else r.next_run_date
		assert nrd > datetime.utcnow()
		assert r.last_run_at is not None

	def test_idempotent_when_not_due(self, db_session, test_user):
		r = self._make(db_session, test_user, day=15)
		# Force next_run_date well into the future
		r.next_run_date = datetime.now(timezone.utc) + timedelta(days=30)
		db_session.commit()

		applied = RecurringTransactionService.process_due(db_session)
		assert applied == []
		# No transaction created
		assert db_session.query(Transaction).filter_by(user_id=test_user.id).count() == 0

	def test_inactive_is_skipped(self, db_session, test_user):
		r = self._make(db_session, test_user, day=1)
		r.next_run_date = datetime.now(timezone.utc) - timedelta(minutes=1)
		r.is_active = False
		db_session.commit()

		applied = RecurringTransactionService.process_due(db_session)
		assert applied == []

	def test_running_twice_in_a_row_only_posts_once(self, db_session, test_user):
		r = self._make(db_session, test_user, day=1)
		r.next_run_date = datetime.now(timezone.utc) - timedelta(minutes=1)
		db_session.commit()

		first = RecurringTransactionService.process_due(db_session)
		second = RecurringTransactionService.process_due(db_session)
		assert len(first) == 1
		assert len(second) == 0
		# Only one transaction in the DB
		assert db_session.query(Transaction).filter_by(user_id=test_user.id).count() == 1


# ──────────────────────────────────────────────────────────────────
# Budget alerts
# ──────────────────────────────────────────────────────────────────

class TestBudgetAlerts:
	def _budget(self, db, user, limit=1000, spent=0):
		b = Budget(
			user_id=user.id, category="Food & Dining",
			monthly_limit=Decimal(limit), current_spent=Decimal(spent),
			last_alert_threshold=0,
		)
		db.add(b)
		db.commit()
		db.refresh(b)
		return b

	def test_no_alert_under_80(self, db_session, test_user):
		test_user.telegram_chat_id = "555"
		db_session.commit()
		self._budget(db_session, test_user, limit=1000, spent=500)  # 50%
		sent = budget_alerts.find_and_send_alerts(db_session)
		assert sent == 0

	def test_alert_at_80(self, db_session, test_user):
		test_user.telegram_chat_id = "555"
		db_session.commit()
		b = self._budget(db_session, test_user, limit=1000, spent=850)  # 85%
		sent = budget_alerts.find_and_send_alerts(db_session)
		assert sent == 1
		db_session.refresh(b)
		assert b.last_alert_threshold == 80

	def test_alert_at_100(self, db_session, test_user):
		test_user.telegram_chat_id = "555"
		db_session.commit()
		b = self._budget(db_session, test_user, limit=1000, spent=1100)
		sent = budget_alerts.find_and_send_alerts(db_session)
		assert sent == 1
		db_session.refresh(b)
		assert b.last_alert_threshold == 100

	def test_idempotent_same_threshold(self, db_session, test_user):
		test_user.telegram_chat_id = "555"
		db_session.commit()
		self._budget(db_session, test_user, limit=1000, spent=850)
		first = budget_alerts.find_and_send_alerts(db_session)
		second = budget_alerts.find_and_send_alerts(db_session)
		assert first == 1
		assert second == 0  # already alerted; threshold tracked

	def test_alerts_skipped_when_notifications_off(self, db_session, test_user):
		test_user.telegram_chat_id = "555"
		test_user.telegram_notifications_enabled = False
		db_session.commit()
		b = self._budget(db_session, test_user, limit=1000, spent=900)
		sent = budget_alerts.find_and_send_alerts(db_session)
		assert sent == 0
		# But threshold should be set so we don't keep checking
		db_session.refresh(b)
		assert b.last_alert_threshold == 80


# ──────────────────────────────────────────────────────────────────
# Weekly digest
# ──────────────────────────────────────────────────────────────────

class TestDigest:
	def test_build_digest_contains_key_sections(self, db_session, test_user, test_transaction):
		test_user.telegram_chat_id = "555"
		test_user.current_streak = 5
		test_user.current_level = 3
		db_session.commit()
		text = digest_service.build_digest(db_session, test_user)
		assert "Your week" in text
		assert "Streak" in text
		assert "MAD" in text

	def test_send_digests_marks_user(self, db_session, test_user):
		test_user.telegram_chat_id = "555"
		test_user.telegram_notifications_enabled = True
		test_user.last_weekly_digest_at = None
		db_session.commit()
		count = digest_service.send_weekly_digests(db_session)
		assert count == 1
		db_session.refresh(test_user)
		assert test_user.last_weekly_digest_at is not None

	def test_send_digests_dedupes_within_23h(self, db_session, test_user):
		test_user.telegram_chat_id = "555"
		test_user.telegram_notifications_enabled = True
		test_user.last_weekly_digest_at = datetime.now(timezone.utc) - timedelta(hours=2)
		db_session.commit()
		count = digest_service.send_weekly_digests(db_session)
		assert count == 0  # too recent

	def test_send_digests_skips_unlinked_user(self, db_session, test_user):
		test_user.telegram_chat_id = None
		db_session.commit()
		assert digest_service.send_weekly_digests(db_session) == 0


# ──────────────────────────────────────────────────────────────────
# can_dm guard
# ──────────────────────────────────────────────────────────────────

class TestCanDM:
	def test_unlinked_returns_false(self, test_user):
		test_user.telegram_chat_id = None
		assert notification_service.can_dm(test_user) is False

	def test_linked_and_opted_in(self, test_user):
		test_user.telegram_chat_id = "555"
		test_user.telegram_notifications_enabled = True
		assert notification_service.can_dm(test_user) is True

	def test_linked_but_opted_out(self, test_user):
		test_user.telegram_chat_id = "555"
		test_user.telegram_notifications_enabled = False
		assert notification_service.can_dm(test_user) is False
