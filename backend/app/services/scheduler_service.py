"""
APScheduler bootstrap.

Two cron jobs:
  - Hourly tick:  fire due recurring transactions + budget alert sweep
  - Weekly tick:  Monday 07:00 UTC (≈ 08:00 Casablanca winter) — send weekly digest

Vercel uses protected HTTP routes called by Supabase Cron. Elsewhere, APScheduler
calls the same job functions. Database locks serialize jobs across instances.
The in-process scheduler is disabled on Vercel and in tests.
"""

from __future__ import annotations

import os
from typing import Optional
from contextlib import contextmanager
from sqlalchemy import text

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db.session import SessionLocal
from app.services import digest_service, recurring_service, budget_alerts, telegram_state_service


_scheduler: Optional[BackgroundScheduler] = None


@contextmanager
def _job_lock(db):
	"""Serialize jobs across instances, even through Supabase transaction pooling.

	The lock lives in a separate open transaction; service-level commits cannot
	accidentally release it. Both jobs share it to avoid duplicate notifications.
	"""
	if db.get_bind().dialect.name != "postgresql":
		yield True  # SQLite unit tests/local development.
		return
	with db.get_bind().begin() as connection:
		connection.execute(text("SET LOCAL idle_in_transaction_session_timeout = '310s'"))
		acquired = connection.execute(
			text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": 764329810},
		).scalar()
		yield acquired


def run_job(db, job_name: str) -> dict:
	if job_name not in {"hourly", "weekly-digest"}:
		raise ValueError("Unknown scheduled job")
	with _job_lock(db) as acquired:
		if not acquired:
			return {"ok": True, "job": job_name, "skipped": "another job is running"}
		if job_name == "hourly":
			applied = recurring_service.RecurringTransactionService.process_due(db)
			for recurring, transaction in applied:
				recurring_service.notify_recurring_applied(db, recurring, transaction)
			alerts = budget_alerts.find_and_send_alerts(db)
			telegram_state_service.delete_expired(db)
			return {"ok": True, "job": job_name, "recurring_applied": len(applied), "alerts_sent": alerts}
		return {"ok": True, "job": job_name, "digests_sent": digest_service.send_weekly_digests(db)}


def _hourly_tick() -> None:
	"""Process due recurring transactions, then sweep budget alerts."""
	db = SessionLocal()
	try:
		print(f"[scheduler] {run_job(db, 'hourly')}")
	except Exception as e:
		print(f"[scheduler] hourly tick error: {e}")
		try:
			db.rollback()
		except Exception:
			pass
	finally:
		db.close()


def _weekly_digest_tick() -> None:
	db = SessionLocal()
	try:
		print(f"[scheduler] {run_job(db, 'weekly-digest')}")
	except Exception as e:
		print(f"[scheduler] weekly digest error: {e}")
		try:
			db.rollback()
		except Exception:
			pass
	finally:
		db.close()


def start_scheduler() -> Optional[BackgroundScheduler]:
	"""Start the global scheduler. Safe to call multiple times — second call is a no-op."""
	global _scheduler
	if _scheduler is not None:
		return _scheduler
	if os.getenv("TESTING") == "1":
		return None
	if os.getenv("VERCEL") or os.getenv("DISABLE_SCHEDULER") == "1":
		print("[scheduler] Using external scheduling, skipping in-process scheduler")
		return None

	sched = BackgroundScheduler(timezone="UTC")
	# Every hour at minute 5 (slight offset from the top so we miss CRON-clock-tick storms).
	sched.add_job(
		_hourly_tick,
		CronTrigger(minute=5, timezone="UTC"),
		id="hourly_tick",
		replace_existing=True,
		max_instances=1,
		coalesce=True,
	)
	# Mondays at 07:00 UTC.
	sched.add_job(
		_weekly_digest_tick,
		CronTrigger(day_of_week="mon", hour=7, minute=0, timezone="UTC"),
		id="weekly_digest",
		replace_existing=True,
		max_instances=1,
		coalesce=True,
	)
	sched.start()
	_scheduler = sched
	print("[scheduler] started — hourly tick + weekly digest")
	return sched


def stop_scheduler() -> None:
	global _scheduler
	if _scheduler is not None:
		try:
			_scheduler.shutdown(wait=False)
		except Exception:
			pass
		_scheduler = None
