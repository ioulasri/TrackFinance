"""
Recurring transactions service.

v1 supports monthly only — each recurring entry has a `day_of_month` (1..31)
and a precomputed `next_run_date`. The scheduler calls `process_due()` hourly;
each due entry is materialized as a real Transaction, then advanced to the next
month. Idempotent: running process_due() twice in the same hour does nothing
the second time (next_run_date is already in the future).
"""

from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.recurring_transaction import RecurringTransaction
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.schemas.recurring import RecurringTransactionCreate, RecurringTransactionUpdate
from app.schemas.transaction import TransactionCreate
from app.services import notification_service
from app.services.transaction_service import TransactionService


def _clamp_day_to_month(year: int, month: int, target_day: int) -> int:
	last = calendar.monthrange(year, month)[1]
	return min(target_day, last)


def _compute_next_run(after: datetime, day_of_month: int) -> datetime:
	"""Next datetime ≥ `after` whose day equals day_of_month (clamped to month length)."""
	# Start with this month
	year, month = after.year, after.month
	clamped = _clamp_day_to_month(year, month, day_of_month)
	candidate = datetime(year, month, clamped, 8, 0, 0, tzinfo=timezone.utc)
	if candidate > after:
		return candidate
	# Otherwise next month
	if month == 12:
		year, month = year + 1, 1
	else:
		month += 1
	clamped = _clamp_day_to_month(year, month, day_of_month)
	return datetime(year, month, clamped, 8, 0, 0, tzinfo=timezone.utc)


class RecurringTransactionService:
	@staticmethod
	def create(db: Session, user_id: int, data: RecurringTransactionCreate) -> RecurringTransaction:
		now = datetime.now(timezone.utc)
		next_run = _compute_next_run(now, data.day_of_month)
		row = RecurringTransaction(
			user_id=user_id,
			amount=data.amount,
			type=data.type,
			category=data.category,
			description=data.description,
			frequency="monthly",
			day_of_month=data.day_of_month,
			next_run_date=next_run,
			is_active=True,
		)
		db.add(row)
		db.commit()
		db.refresh(row)
		return row

	@staticmethod
	def list_for_user(db: Session, user_id: int) -> List[RecurringTransaction]:
		return (
			db.query(RecurringTransaction)
			.filter(RecurringTransaction.user_id == user_id)
			.order_by(RecurringTransaction.is_active.desc(), RecurringTransaction.next_run_date.asc())
			.all()
		)

	@staticmethod
	def get(db: Session, user_id: int, rid: int) -> Optional[RecurringTransaction]:
		return (
			db.query(RecurringTransaction)
			.filter(RecurringTransaction.id == rid, RecurringTransaction.user_id == user_id)
			.first()
		)

	@staticmethod
	def update(
		db: Session, user_id: int, rid: int, data: RecurringTransactionUpdate
	) -> Optional[RecurringTransaction]:
		row = RecurringTransactionService.get(db, user_id, rid)
		if not row:
			return None
		update_dict = data.model_dump(exclude_unset=True)
		for key, value in update_dict.items():
			setattr(row, key, value)
		# Recompute next_run_date if the day changed and the row is active.
		if "day_of_month" in update_dict and row.is_active:
			row.next_run_date = _compute_next_run(datetime.now(timezone.utc), row.day_of_month)
		row.updated_at = datetime.now(timezone.utc)
		db.commit()
		db.refresh(row)
		return row

	@staticmethod
	def delete(db: Session, user_id: int, rid: int) -> bool:
		row = RecurringTransactionService.get(db, user_id, rid)
		if not row:
			return False
		db.delete(row)
		db.commit()
		return True

	@staticmethod
	def process_due(db: Session, now: Optional[datetime] = None) -> List[Tuple[RecurringTransaction, Transaction]]:
		"""
		Materialize every due recurring entry. Returns a list of (recurring, new_transaction)
		for each one applied. Caller may send notifications.
		"""
		now = now or datetime.now(timezone.utc)
		due = (
			db.query(RecurringTransaction)
			.filter(
				RecurringTransaction.is_active == True,  # noqa: E712
				RecurringTransaction.next_run_date <= now,
			)
			.all()
		)
		results: List[Tuple[RecurringTransaction, Transaction]] = []
		for r in due:
			try:
				tx = TransactionService.create_transaction(
					db, r.user_id,
					TransactionCreate(
						amount=float(r.amount),
						type=TransactionType(r.type),
						category=r.category,
						description=(r.description or "Recurring"),
						date=r.next_run_date,
					),
				)
				r.last_run_at = now
				r.next_run_date = _compute_next_run(now, r.day_of_month)
				r.updated_at = now
				db.commit()
				db.refresh(r)
				results.append((r, tx))
			except Exception as e:
				print(f"[recurring] failed to process #{r.id}: {e}")
				db.rollback()
		return results


def notify_recurring_applied(db: Session, recurring: RecurringTransaction, tx: Transaction) -> None:
	"""DM the user about a newly auto-created transaction."""
	user = db.query(User).filter(User.id == recurring.user_id).first()
	if not user:
		return
	emoji = "📥" if recurring.type == "income" else "📤"
	notification_service.notify(
		user,
		f"{emoji} *Recurring posted*\n"
		f"`#{tx.id}` {float(tx.amount):,.2f} MAD · {tx.category}\n"
		f"_{recurring.description or 'Recurring'}_\n"
		f"Next run: {recurring.next_run_date.strftime('%Y-%m-%d')}",
	)
