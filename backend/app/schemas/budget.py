from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class BudgetBase(BaseModel):
	category: str = Field(..., min_length=1, max_length=50)
	monthly_limit: float = Field(..., gt=0, description="Monthly limit should be positive")

class BudgetCreate(BudgetBase):
	pass

class BudgetUpdate(BaseModel):
	monthly_limit: float = Field(None, gt=0, description="Monthly limit should be positive")

class BudgetResponse(BudgetBase):
	id: int
	user_id: int
	current_spent: float = 0.0
	last_reset_date: datetime
	created_at: datetime

	percentage: Optional[float] = None
	status: Optional[str] = None
	damage: Optional[float] = None

	class Config:
		from_attributes = True