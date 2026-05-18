from sqlalchemy import (
	Column, Integer, String, TIMESTAMP, Boolean, DECIMAL,
	CheckConstraint, ForeignKey, Index, text,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


class RecurringTransaction(Base):
	__tablename__ = "recurring_transactions"

	id = Column(Integer, primary_key=True)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

	amount = Column(DECIMAL(10, 2), nullable=False)
	type = Column(String(20), nullable=False)          # 'income' | 'expense'
	category = Column(String(50), nullable=False)
	description = Column(String(255), nullable=True)

	# v1 supports monthly only — keep the column for forward compat.
	frequency = Column(String(20), nullable=False, server_default="monthly")
	day_of_month = Column(Integer, nullable=False)     # 1..31; clamped to month end at run time

	next_run_date = Column(TIMESTAMP(timezone=True), nullable=False)
	is_active = Column(Boolean, nullable=False, server_default=text("TRUE"))
	last_run_at = Column(TIMESTAMP(timezone=True), nullable=True)

	created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
	updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP"))

	__table_args__ = (
		CheckConstraint("amount > 0", name="ck_recurring_amount_positive"),
		CheckConstraint("type IN ('income', 'expense')", name="ck_recurring_type"),
		CheckConstraint("day_of_month BETWEEN 1 AND 31", name="ck_recurring_day_of_month"),
		Index("idx_recurring_user", "user_id"),
		Index("idx_recurring_next_run", "next_run_date", "is_active"),
	)

	user = relationship("User")
