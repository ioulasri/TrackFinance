from pydoc import describe
from unicodedata import category
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.core.security import hash_password
from typing import List, Optional
from datetime import date, datetime

class TransactionService:
	"""Handles transaction logic"""

	@staticmethod
	def create_transaction(db: Session, user_id: int, transaction_data: TransactionCreate) -> Transaction:

		new_transaction = Transaction(
			user_id=user_id,
			amount=transaction_data.amount,
			category=transaction_data.category,
			type=transaction_data.type.value,
			description=transaction_data.description,
			date=transaction_data.date
		)

		try:
			db.add(new_transaction)
			db.commit()
			db.refresh(new_transaction)
			# TODO: Award XP to user (Phase 2)
			# TODO: Update budget tracking (Phase 3)
			# TODO: Update user's last_activity_date for streaks (Phase 2)

			return new_transaction
		
		except IntegrityError:
			db.rollback()
			raise ValueError("Database constraint violation")
		
	@staticmethod
	def get_user_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 10) -> List[Transaction]:
		return db.query(Transaction).filter(
			Transaction.user_id == user_id,
			Transaction.is_deleted == False
		).offset(skip).limit(limit).all()
	
	@staticmethod
	def get_transaction(db: Session, user_id: int, transaction_id: int) -> Optional[Transaction]:
		return db.query(Transaction).filter(
			Transaction.id == transaction_id,
			Transaction.user_id == user_id,
			Transaction.is_deleted == False
		).first()
	
	@staticmethod
	def update_transaction(db: Session, user_id: int, transaction_id: int, update_data: TransactionUpdate) -> Optional[Transaction]:
		transaction = TransactionService.get_transaction(db, user_id, transaction_id)

		if not transaction:
			return None
		
		if update_data.amount is not None:
			transaction.amount = update_data.amount
		if update_data.category is not None:
			transaction.category = update_data.category
		if update_data.description is not None:
			transaction.description = update_data.description
		if update_data.date is not None:
			transaction.date = update_data.date
		
		transaction.updated_at = datetime.now()

		try:
			db.commit()
			db.refresh(transaction)
			return transaction
		except IntegrityError:
			db.rollback()
			raise ValueError("Database contraint violation")
		
	@staticmethod
	def delete_transaction(db: Session, user_id: int, transaction_id: int) -> bool:
		transaction = TransactionService.get_transaction(db, user_id, transaction_id)

		if not transaction:
			return False
		
		transaction.is_deleted = True
		transaction.updated_at = datetime.now()

		db.commit()
		return True
