from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from typing import Optional

class GoalBase(BaseModel):
    """Base schema for Goal"""
    name: str = Field(..., min_length=1, max_length=100, description="Goal name")
    icon: str = Field(default="🎯", max_length=20, description="Emoji icon for the goal")
    target_amount: float = Field(..., gt=0, description="Target amount in MAD")
    current_amount: float = Field(default=0.0, ge=0, description="Current saved amount in MAD")
    deadline: Optional[date] = Field(None, description="Optional deadline for the goal")
    category: Optional[str] = Field(None, max_length=50, description="Goal category")
    description: Optional[str] = Field(None, max_length=500, description="Goal description")

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, v):
        if v and v < date.today():
            raise ValueError("Deadline cannot be in the past")
        return v

    @field_validator("current_amount")
    @classmethod
    def validate_current_amount(cls, v):
        if v < 0:
            raise ValueError("Current amount cannot be negative")
        return v


class GoalCreate(GoalBase):
    """Schema for creating a goal"""
    pass


class GoalUpdate(BaseModel):
    """Schema for updating a goal"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = Field(None, max_length=20)
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    deadline: Optional[date] = None
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, v):
        if v and v < date.today():
            raise ValueError("Deadline cannot be in the past")
        return v


class GoalResponse(GoalBase):
    """Schema for goal response"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GoalStats(BaseModel):
    """Statistics for user's goals"""
    total_goals: int
    completed_goals: int
    total_target: float
    total_saved: float
    overall_progress: float
