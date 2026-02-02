from sqlalchemy import Column, Integer, String, TIMESTAMP, Boolean, DECIMAL, CheckConstraint, ForeignKey, Index, text, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base
from enum import Enum as PyEnum

class TransactionType(str, PyEnum):
	INCOME = "income"
	EXPENSE = "expense"

class Transaction(Base):
	__tablename__ = "transactions"

	id = Column(Integer, primary_key=True)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

	amount = Column(DECIMAL(10, 2), nullable=False)
	category = Column(String(50), nullable=False)
	type = Column(Enum(TransactionType), nullable=False)
	description = Column(String(255))
	date = Column(TIMESTAMP, nullable=False)

	is_deleted = Column(Boolean, server_default=text("FALSE"), nullable=False)

	created_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
	updated_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

	__table_args__ = (
		CheckConstraint("amount > 0", name="ck_transaction_amount"),
		CheckConstraint("type IN ('income', 'expense')", name="ck_transaction_type"),
		Index("idx_transactions_user_id", "user_id"),
		Index("idx_transactions_date", "date"),
		Index("idx_transactions_category", "category"),
		Index("idx_transactions_user_date", "user_id", text("date DESC"))
	)

	user = relationship("User", back_populates="transactions")