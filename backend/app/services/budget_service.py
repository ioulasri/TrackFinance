from pydoc import describe
from unicodedata import category
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetUpdate
from app.core.security import hash_password
from typing import List, Optional
from datetime import date, datetime
from app.models import budget

class BudgetService:
	"""Handles budget logic"""

	@staticmethod
	def create_budget(db: Session, user_id: int, budget_data: BudgetCreate) -> Budget:

		new_budget = Budget(
			user_id=user_id,
			category=budget_data.category,
			monthly_limit=budget_data.monthly_limit
		)

		try:
			db.add(new_budget)
			db.commit()
			db.refresh(new_budget)

			return new_budget
		except IntegrityError:
			db.rollback()
			raise ValueError("Database constraint violation")
	
	@staticmethod
	def get_user_budgets(db: Session, user_id: int, skip: int = 0, limit: int = 10) -> List[Budget]:
		return db.query(Budget).filter(
			Budget.user_id == user_id,
		).offset(skip).limit(limit).all()
	
