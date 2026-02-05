from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate
from app.core.security import hash_password
from typing import List, Optional
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from app.models import budget

class BudgetService:
	"""Handles budget logic"""

	@staticmethod
	def create_budget(db: Session, user_id: int, budget_data: BudgetCreate) -> Budget:
		now = datetime.now(timezone.utc)
		start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
		
		current_spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
			Transaction.user_id == user_id,
			Transaction.category == budget_data.category,
			Transaction.type == 'expense',
			Transaction.is_deleted == False,
			Transaction.date >= start_of_month
		).scalar() or Decimal(0)

		new_budget = Budget(
			user_id=user_id,
			category=budget_data.category,
			monthly_limit=budget_data.monthly_limit,
			current_spent=current_spent,
			last_reset_date=now)
		try:
			db.add(new_budget)
			db.commit()
			db.refresh(new_budget)

			return new_budget
		except IntegrityError as e:
			db.rollback()
			if "unique_budget_user_category" in str(e):
				raise ValueError(f"Budget for caregory '{budget_data.category}' already exists")
			raise ValueError("Database constraint violation")
	
	@staticmethod
	def get_user_budgets(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Budget]:
		return db.query(Budget).filter(
			Budget.user_id == user_id,
		).offset(skip).limit(limit).all()
	
	@staticmethod
	def get_budget_by_id(db: Session, budget_id: int, user_id: int) -> Optional[Budget]:
		return db.query(Budget).filter(
			Budget.id == budget_id,
			Budget.user_id == user_id
		).first()
	
	@staticmethod
	def get_budget_by_category(db: Session, user_id: int, category: str) -> Optional[Budget]:
		return db.query(Budget).filter(
			Budget.user_id == user_id,
			Budget.category == category
		).first()
	
	@staticmethod
	def update_budget(db: Session, budget_id: int, user_id: int, budget_data: BudgetUpdate) -> Optional[Budget]:
		budget = BudgetService.get_budget_by_id(db, budget_id, user_id)

		if not budget:
			return None
		
		if budget_data.monthly_limit is not None:
			budget.monthly_limit = budget_data.monthly_limit
		
		if budget_data.category is not None:
			budget.category = budget_data.category

		budget.updated_at = datetime.now(timezone.utc)

		try:
			db.commit()
			db.refresh(budget)
			return budget
		except IntegrityError:
			db.rollback()
			raise ValueError("Category already exists for this user")
		
	@staticmethod
	def delete_budget(db: Session, budget_id: int, user_id: int) -> bool:
		budget = BudgetService.get_budget_by_id(db, budget_id, user_id)

		if not budget:
			return False
		
		db.delete(budget)
		db.commit()
		return True
	
	@staticmethod
	def update_spent_amount(db: Session, user_id: int, category: str, amount: Decimal) -> Optional[Budget]:
		budget = BudgetService.get_budget_by_category(db, user_id, category)

		if not budget:
			return None
		
		budget.current_spent += Decimal(amount)
		budget.updated_at = datetime.now(timezone.utc)

		db.commit()
		db.refresh(budget)
		return budget
	
	@staticmethod
	def reset_monthly_budgets(db: Session, user_id: int) -> List[Budget]:
		budgets = db.query(Budget).filter(Budget.user_id == user_id).all()

		for budget in budgets:
			budget.current_spent = 0
			budget.last_reset_date = datetime.now(timezone.utc)
			budget.updated_at = datetime.now(timezone.utc)

		db.commit()
		return budgets
	
	@staticmethod
	def get_budget_status(db: Session, user_id: int) -> dict:
		budgets = BudgetService.get_user_budgets(db, user_id)

		total_limit = sum(b.monthly_limit for b in budgets)
		total_spent = sum(b.current_spent for b in budgets)

		over_budget_count = sum(1 for b in budgets if b.current_spent > b.monthly_limit)

		return {
			"total_budgets": len(budgets),
			"total_monthly_limit": float(total_limit),
			"total_spent": float(total_spent),
			"remaining": float(total_limit - total_spent),
			"over_budget_count": over_budget_count,
			"budgets": [
				{
					"id": b.id,
					"category": b.category,
					"limit": float(b.monthly_limit),
					"spent": float(b.current_spent),
					"remaining": float(b.monthly_limit - b.current_spent),
					"percentage_used": round((b.current_spent / b.monthly_limit * 100), 2) if b.monthly_limit > 0 else 0,
					"is_over_budget": b.current_spent > b.monthly_limit
				}
				for b in budgets
			]
		}
