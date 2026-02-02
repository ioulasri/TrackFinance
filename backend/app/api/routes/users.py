from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token
from app.services.user_service import UserService
from app.core.security import create_access_token
from datetime import timedelta

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
def get_current_user(db: Session = Depends(get_db)):
	raise HTTPException(status_code=501, detail="Authentication not implemented yet")