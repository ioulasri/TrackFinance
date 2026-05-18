"""
Budget alerts.

Thresholds: 80% and 100%. Each budget has a `last_alert_threshold` integer
(0, 80, or 100) so we only DM once per crossing per month. A monthly reset
(`reset_monthly_budgets`) zeroes the threshold along with current_spent so
next month starts fresh.
"""

from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.user import User
from app.services import notification_service


THRESHOLDS = [80, 100]  # ascending


def _percentage(b: Budget) -> int:
	limit = float(b.monthly_limit or 0)
	if limit <= 0:
		return 0
	return int(float(b.current_spent or 0) / limit * 100)


def find_and_send_alerts(db: Session) -> int:
	"""
	Scan all budgets; DM the user when current usage crosses a threshold we
	haven't alerted on yet this month. Returns the number of alerts sent.
	"""
	rows = db.query(Budget).all()
	sent = 0
	for b in rows:
		pct = _percentage(b)
		# Find the highest threshold the budget has crossed.
		crossed = max((t for t in THRESHOLDS if pct >= t), default=0)
		if crossed <= (b.last_alert_threshold or 0):
			continue

		user = db.query(User).filter(User.id == b.user_id).first()
		if user is None or not notification_service.can_dm(user):
			# Update the threshold anyway so we don't recheck the same crossing forever.
			b.last_alert_threshold = crossed
			db.commit()
			continue

		spent = float(b.current_spent or 0)
		limit = float(b.monthly_limit or 0)
		if crossed >= 100:
			text = (
				f"🚨 *Budget over limit*\n"
				f"*{b.category}*: {spent:,.2f} / {limit:,.2f} MAD ({pct}%)\n"
				f"Consider easing up or raising the cap."
			)
		else:
			text = (
				f"⚠️ *Budget at {pct}%*\n"
				f"*{b.category}*: {spent:,.2f} / {limit:,.2f} MAD"
			)
		notification_service.notify(user, text)
		b.last_alert_threshold = crossed
		db.commit()
		sent += 1
	return sent


def reset_alert_thresholds_for_user(db: Session, user_id: int) -> None:
	"""Call from the monthly budget reset path so next month re-fires alerts cleanly."""
	db.query(Budget).filter(Budget.user_id == user_id).update({Budget.last_alert_threshold: 0})
	db.commit()
