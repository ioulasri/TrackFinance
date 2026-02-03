from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserResponse, UserStatsResponse, UserLogin, Token
from app.services.user_service import UserService
from app.api.dependencies import get_current_user
from app.models.user import User
from app.core.security import create_access_token
from datetime import timedelta
from app.services.xp_service import XPService
from app.schemas.user import UserStatsResponse

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
	
	try:
		new_user = UserService.create_user(db, user_data)
		return new_user
	except ValueError as e:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=str(e)
		)

@router.post("/login", response_model=Token)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):

	user = UserService.authenticate_user(db, credentials.username, credentials.password)

	if not user:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Incorrect username or password",
			headers={"WWW-Authenticate": "Bearer"}	
		)
	
	access_token = create_access_token(
		data={"sub": user.username},
		expires_delta=timedelta(minutes=30)
	)

	return Token(access_token=access_token, token_type="bearer")

@router.get("/me", response_model=UserResponse)
def get_current_user_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
	return current_user

@router.get("/me/stats", response_model=UserStatsResponse)
def get_current_user_stats(current_user: User = Depends(get_current_user)):
	next_level_up = XPService.get_xp_for_next_level(current_user.current_level)
	xp_needed = next_level_up - current_user.total_xp
	progress_pct = (current_user.total_xp / next_level_up) * 100

	return {
		"user_id": current_user.id,
		"username": current_user.username,
		"total_xp": current_user.total_xp,
		"current_level": current_user.current_level,
		"current_streak": current_user.current_streak,
		"longest_streak": current_user.longest_streak,
		"xp_to_next_level": xp_needed,
		"level_progress_percentage": progress_pct
	}
