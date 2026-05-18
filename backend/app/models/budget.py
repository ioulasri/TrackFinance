from sqlalchemy import Column, Integer, String, TIMESTAMP, Boolean, DECIMAL, CheckConstraint, ForeignKey, Index, UniqueConstraint, text, Enum
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from app.db.session import Base

class Budget(Base):
	__tablename__ = "budgets"

	id = Column(Integer, primary_key=True)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

	category = Column(String(50), nullable=False)

	monthly_limit = Column(DECIMAL(10, 2), nullable=False)
	current_spent = Column(DECIMAL(10, 2), server_default=text("0"))

	last_reset_date = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
	last_alert_threshold = Column(Integer, nullable=False, server_default=text("0"))

	created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
	updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

	__table_args__ = (
		CheckConstraint("monthly_limit > 0", name="ck_monthly_limit_amount"),
		CheckConstraint("current_spent >= 0", name="ck_current_spent_amount"),
		UniqueConstraint("user_id", "category", name="unique_budget_user_category"),
		Index("idx_budgets_user_id", "user_id"),
		Index("idx_budgets_category", "category"),
	)

	user = relationship("User", back_populates="budgets")
