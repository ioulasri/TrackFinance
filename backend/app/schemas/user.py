from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
	username: str = Field(..., min_length=3, max_length=50)
	email: EmailStr

class UserCreate(UserBase):
	password: str = Field(..., min_length=8, max_length=100)

class UserLogin(BaseModel):
	username: str
	password: str

class UserResponse(UserBase):
	id: int
	total_xp: int = 0
	current_level: int = 0
	current_streak: int = 0
	longest_streak: int = 0
	created_at: datetime

	class Config:
		from_attributes = True
	
class Token(BaseModel):
	access_token: str
	token_type: str = "bearer"

class TokenData(BaseModel):
	username: Optional[str] = None