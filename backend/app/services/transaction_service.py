from pydoc import describe
from unicodedata import category
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.core.security import hash_password
from app.services.xp_service import XPService
from app.services.budget_service import BudgetService
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

			# Award XP to user
			XPService.award_xp(db, user_id, 10)
			
			# Update budget tracking for expense transactions
			if new_transaction.type == 'expense':
				BudgetService.update_spent_amount(db, user_id, new_transaction.category, new_transaction.amount)
			
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
		).order_by(Transaction.date.desc(), Transaction.created_at.desc()).offset(skip).limit(limit).all()
	
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
		
		# Track old values for budget updates
		old_amount = transaction.amount
		old_category = transaction.category
		old_type = transaction.type
		
		# Update fields
		if update_data.amount is not None:
			transaction.amount = update_data.amount
		if update_data.category is not None:
			transaction.category = update_data.category
		if update_data.type is not None:
			transaction.type = update_data.type.value
		if update_data.description is not None:
			transaction.description = update_data.description
		if update_data.date is not None:
			transaction.date = update_data.date
		
		transaction.updated_at = datetime.now()

		try:
			db.commit()
			db.refresh(transaction)
			
			# Handle budget tracking updates
			# If type changed or it's an expense with changed amount/category
			if old_type != transaction.type:
				# Type changed
				if old_type == 'expense':
					# Was expense, remove from budget tracking
					BudgetService.update_spent_amount(db, user_id, old_category, -old_amount)
				if transaction.type == 'expense':
					# Now expense, add to budget tracking
					BudgetService.update_spent_amount(db, user_id, transaction.category, transaction.amount)
			elif transaction.type == 'expense' and (update_data.amount is not None or update_data.category is not None):
				# Type didn't change but it's an expense with updated amount or category
				# Revert old amount from old category
				BudgetService.update_spent_amount(db, user_id, old_category, -old_amount)
				# Add new amount to new category
				BudgetService.update_spent_amount(db, user_id, transaction.category, transaction.amount)
			
			return transaction
		except IntegrityError:
			db.rollback()
			raise ValueError("Database constraint violation")
		
	@staticmethod
	def delete_transaction(db: Session, user_id: int, transaction_id: int) -> bool:
		transaction = TransactionService.get_transaction(db, user_id, transaction_id)

		if not transaction:
			return False
		
		# Revert budget tracking for expense transactions
		if transaction.type == 'expense':
			BudgetService.update_spent_amount(db, user_id, transaction.category, -transaction.amount)
		
		transaction.is_deleted = True
		transaction.updated_at = datetime.now()

		db.commit()
		return True
