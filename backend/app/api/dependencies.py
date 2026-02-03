from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user_from_token
from app.models.user import User

security = HTTPBearer()

async def get_current_user(
		credentials: HTTPAuthorizationCredentials = Depends(security),
		db: Session = Depends(get_db)
) -> User:
	token = credentials.credentials

	user = await get_current_user_from_token(token, db)

	if not user:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid authentication credentials",
			headers={"WWW-Authenticate": "Bearer"}
		)
	
	return user