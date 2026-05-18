from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


class RecurringTransactionBase(BaseModel):
	amount: float = Field(..., gt=0)
	type: Literal["income", "expense"]
	category: str = Field(..., min_length=1, max_length=50)
	description: Optional[str] = Field(None, max_length=255)
	day_of_month: int = Field(..., ge=1, le=31)


class RecurringTransactionCreate(RecurringTransactionBase):
	pass


class RecurringTransactionUpdate(BaseModel):
	amount: Optional[float] = Field(None, gt=0)
	type: Optional[Literal["income", "expense"]] = None
	category: Optional[str] = Field(None, min_length=1, max_length=50)
	description: Optional[str] = Field(None, max_length=255)
	day_of_month: Optional[int] = Field(None, ge=1, le=31)
	is_active: Optional[bool] = None


class RecurringTransactionRead(RecurringTransactionBase):
	id: int
	is_active: bool
	frequency: str
	next_run_date: datetime
	last_run_at: Optional[datetime] = None
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)
