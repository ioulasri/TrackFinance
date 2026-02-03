from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class AchievementBase(BaseModel):
	name: str = Field(..., max_length=100)
	description: str = Field(..., max_length=255)
	icon: Optional[str] = Field(None, max_length=100)
	xp_reward: int = Field(..., ge=0)
	category: str = Field(..., max_length=50)
	requirement_type: str = Field(..., max_length=50)
	requirement_value: int = Field(..., gt=0)

class AchievementCreate(AchievementBase):
	pass

class AchievementResponse(AchievementBase):
	id: int
	created_at: datetime

	class Config:
		from_attributes = True

class UserAchievementResponse(BaseModel):
	achievement_id: int
	achievement: AchievementResponse
	progress: int = Field(..., ge=0, le=100)
	unlocked_at: Optional[datetime]

	class Config:
		from_attributes = True

class AchievementStatsResponse(BaseModel):
	total_achievements: int
	unlocked_count: int
	completion_percentage: float
