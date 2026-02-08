from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class TransactionType(str, Enum):
	INCOME = "income"
	EXPENSE = "expense"

class TransactionBase(BaseModel):
	amount: float = Field(..., gt=0, description="Amount must be positive")
	category: str = Field(..., min_length=1, max_length=50)
	type: TransactionType
	description: str = Field(None, max_length=255)
	date: datetime

class TransactionCreate(TransactionBase):
	pass

class TransactionUpdate(BaseModel):
	amount: float = Field(None, gt=0)
	category: str = Field(None, min_length=1, max_length=50)
	type: TransactionType = None
	description: str = Field(None, max_length=255)
	date: datetime = None

class TransactionResponse(TransactionBase):
	id: int
	user_id: int
	created_at: datetime
	updated_at: datetime

	class Config:
		from_attributes = True
		