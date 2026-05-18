"""
Weekly digest sender.

Every Monday at ~08:00 Africa/Casablanca (≈07:00 UTC summer, 08:00 winter — we
just schedule on UTC and accept a one-hour DST drift). For each user with
`telegram_notifications_enabled` and a linked chat, send one summary.

Idempotency: `last_weekly_digest_at` on User is updated after a successful send.
If the scheduler fires twice in the same 24h window, the second call no-ops.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session


def _as_aware(dt: Optional[datetime]) -> Optional[datetime]:
	"""SQLite (test backend) returns naive datetimes even from timezone-aware columns;
	treat them as UTC. Postgres returns aware datetimes already."""
	if dt is None:
		return None
	return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

from app.models.budget import Budget
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User
from app.services import notification_service


def _sum_expense(db: Session, user_id: int, since: datetime, until: Optional[datetime] = None) -> float:
	q = db.query(func.sum(Transaction.amount)).filter(
		Transaction.user_id == user_id,
		Transaction.type == "expense",
		Transaction.is_deleted == False,  # noqa: E712
		Transaction.date >= since,
	)
	if until is not None:
		q = q.filter(Transaction.date < until)
	return float(q.scalar() or 0.0)


def _top_category(db: Session, user_id: int, since: datetime, until: datetime) -> Optional[Dict]:
	row = (
		db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
		.filter(
			Transaction.user_id == user_id,
			Transaction.type == "expense",
			Transaction.is_deleted == False,  # noqa: E712
			Transaction.date >= since,
			Transaction.date < until,
		)
		.group_by(Transaction.category)
		.order_by(func.sum(Transaction.amount).desc())
		.first()
	)
	return {"category": row.category, "total": float(row.total)} if row else None


def build_digest(db: Session, user: User, now: Optional[datetime] = None) -> str:
	now = now or datetime.now(timezone.utc)
	this_week_start = now - timedelta(days=7)
	prev_week_start = now - timedelta(days=14)

	this_week = _sum_expense(db, user.id, this_week_start, now)
	last_week = _sum_expense(db, user.id, prev_week_start, this_week_start)

	if last_week > 0:
		delta_pct = (this_week - last_week) / last_week * 100
		trend = f" ({'+' if delta_pct >= 0 else ''}{delta_pct:.0f}% vs last week)"
	else:
		trend = ""

	top = _top_category(db, user.id, this_week_start, now)

	# Goals: count active and overall progress
	goals = db.query(Goal).filter(Goal.user_id == user.id).all()
	active_goals = [g for g in goals if not (g.target_amount and g.current_amount and g.current_amount >= g.target_amount)]
	# Budgets over
	over_budget = (
		db.query(Budget)
		.filter(Budget.user_id == user.id, Budget.current_spent > Budget.monthly_limit)
		.count()
	)

	lines = [
		f"☀️ *Your week in TrackFinance*",
		f"_{prev_week_start.strftime('%b %d')} → {now.strftime('%b %d')}_",
		"",
		f"💸 Spent this week: *{this_week:,.2f} MAD*{trend}",
	]
	if top:
		lines.append(f"🥇 Biggest category: *{top['category']}* — {top['total']:,.2f} MAD")
	lines.append(f"🔥 Streak: *{user.current_streak or 0} days* · Level *{user.current_level or 0}* · {user.total_xp or 0} XP")
	if over_budget:
		lines.append(f"⚠️ Over-budget categories: *{over_budget}* — try /budgets")
	if active_goals:
		lines.append(f"🎯 Active goals: *{len(active_goals)}* — try /goals")
	lines.append("")
	lines.append("Tap /menu for quick actions.")
	return "\n".join(lines)


def send_weekly_digests(db: Session, now: Optional[datetime] = None) -> int:
	"""Send to every eligible user. Returns count of digests sent."""
	now = now or datetime.now(timezone.utc)
	threshold = now - timedelta(hours=23)  # de-dupe: no resend within 23h

	users = (
		db.query(User)
		.filter(
			User.telegram_chat_id.isnot(None),
			User.telegram_notifications_enabled == True,  # noqa: E712
		)
		.all()
	)

	count = 0
	for u in users:
		last_sent = _as_aware(u.last_weekly_digest_at)
		if last_sent and last_sent >= threshold:
			continue
		try:
			text = build_digest(db, u, now)
			if notification_service.notify(u, text):
				u.last_weekly_digest_at = now
				db.commit()
				count += 1
		except Exception as e:
			print(f"[digest] failed for user {u.id}: {e}")
			db.rollback()
	return count
