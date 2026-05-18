"""
APScheduler bootstrap.

Two cron jobs:
  - Hourly tick:  fire due recurring transactions + budget alert sweep
  - Weekly tick:  Monday 07:00 UTC (≈ 08:00 Casablanca winter) — send weekly digest

In-process. State is held in the FastAPI process; restarts are tolerated because
every job is idempotent (recurring uses next_run_date<=now; budget alerts use
last_alert_threshold; digest uses last_weekly_digest_at + 23h de-dupe).

Disabled in tests via the `TESTING` env var.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db.session import SessionLocal
from app.services import digest_service, recurring_service, budget_alerts


_scheduler: Optional[BackgroundScheduler] = None


def _hourly_tick() -> None:
	"""Process due recurring transactions, then sweep budget alerts."""
	db = SessionLocal()
	try:
		applied = recurring_service.RecurringTransactionService.process_due(db)
		for r, tx in applied:
			recurring_service.notify_recurring_applied(db, r, tx)
		alerts_sent = budget_alerts.find_and_send_alerts(db)
		if applied or alerts_sent:
			print(f"[scheduler] hourly tick @ {datetime.now(timezone.utc).isoformat()} "
				f"— {len(applied)} recurring, {alerts_sent} alerts")
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
		sent = digest_service.send_weekly_digests(db)
		print(f"[scheduler] weekly digest @ {datetime.now(timezone.utc).isoformat()} — {sent} sent")
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
	if os.getenv("DISABLE_SCHEDULER") == "1":
		print("[scheduler] DISABLE_SCHEDULER=1, skipping")
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
