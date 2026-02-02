from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from app.db.config import settings
from app.models.user import User

def hash_password(password: str) -> str:
	password_bytes = password.encode('utf-8')
	salt = bcrypt.gensalt()
	hashed = bcrypt.hashpw(password_bytes, salt)
	return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
	password_bytes = plain_password.encode('utf-8')
	hashed_bytes = hashed_password.encode('utf-8')
	return bcrypt.checkpw(password_bytes, hashed_bytes)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
	to_encode = data.copy()

	if expires_delta:
		expire = datetime.now(timezone.utc) + expires_delta
	else:
		expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
	
	to_encode.update({"exp": expire})
	encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

	return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
	try:
		payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
		return payload
	except JWTError:
		return None
	
async def get_current_user_from_token(token: str, db) -> Optional[User]:    
    payload = decode_token(token)
    if not payload:
        return None
    
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    
    return user