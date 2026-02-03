from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.achievement import AchievementCreate, AchievementResponse, AchievementStatsResponse, UserAchievementResponse
from app.api.dependencies import get_current_user
from app.models.user import User
from typing import List, Optional
from app.services.xp_service import XPService
from app.schemas.user import UserStatsResponse
from app.models.achievement import Achievement
from app.models.user_achievement import UserAchievement
from app.services.achievement_services import AchievementService

router = APIRouter(prefix="/api/v1/achievements", tags=["achievements"])

@router.get("/", response_model=List[AchievementResponse])
def get_all_achievements(
	db: Session = Depends(get_db), 
	skip: int = 0, 
	limit: int = 100) -> List[Achievement]:

	achievemets = AchievementService.list_achievements(db, skip, limit)

	return achievemets
	

@router.get("/me", response_model=List[UserAchievementResponse])
def get_my_achievements(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	skip: int = 0,
	limit: int = 100
	) -> List[UserAchievement]:
	achievements = AchievementService.list_user_achievements(
		db, 
		user_id=current_user.id, 
		skip=skip, 
		limit=limit)
	
	return achievements

@router.get("/me/stats")
def get_my_achievement_stats(
	db: Session = Depends(get_db), 
	current_user: User = Depends(get_current_user),
	):
	
	return AchievementService.get_user_achievement_stats(db, current_user.id)

@router.get("/{achievement_id}", response_model=AchievementResponse)
def get_achievement_by_id(achievement_id: int, db: Session = Depends(get_db)) -> Optional[Achievement]:
	
	achievement = AchievementService.get_achievement_by_id(db, achievement_id)
	if not achievement:
		raise HTTPException(status_code=404, detail="Acheivement not found")

	return achievement

@router.post("/{achievement_id}/unlock", status_code=status.HTTP_400_BAD_REQUEST)
def unlock_achievement_by_user_id(user_id: int, achievement_id: int, db: Session = Depends(get_db)):
	success = AchievementService.check_and_unlock_achievement(db, user_id, achievement_id)

	if not success:
		raise HTTPException(status_code=400, detail="Achievement already unlocked")
	
	return None