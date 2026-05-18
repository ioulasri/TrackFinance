from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password, create_access_token
from typing import Optional
from datetime import timezone, datetime
from app.services.email_service import EmailService

class UserService:
	"""Handles user logic"""

	@staticmethod
	def create_user(db: Session, user_data: UserCreate) -> User:
		exisiting_email = db.query(User).filter(User.email == user_data.email).first()
		if exisiting_email:
			raise ValueError("Email already registered")

		exisiting_username = db.query(User).filter(User.username == user_data.username).first()
		if exisiting_username:
			raise ValueError("Username already taken")
	
		hashed_pwd = hash_password(user_data.password)
		token, expires = EmailService.generate_verification_token()

		new_user = User(
			email=user_data.email,
			username=user_data.username,
			hashed_password=hashed_pwd,
			verification_token=token,
			verification_token_expires=expires,
			total_xp=0,
			current_level=0,
			current_streak=0,
			longest_streak=0
		)

		try:
			db.add(new_user)
			db.commit()
			db.refresh(new_user)

			EmailService.send_verification_email(new_user.email, new_user.username, token)

			return new_user
		except IntegrityError:
			db.rollback()
			raise ValueError("Database constraint violation")


	@staticmethod
	def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:

		user = db.query(User).filter(User.username == username).first()

		if not user:
			return None
	
		# OAuth-only users have no password — can't log in with email/password
		if not user.hashed_password:
			return None

		if not verify_password(password, user.hashed_password):
			return None

		if not user.is_verified:
			raise ValueError("EMAIL_NOT_VERIFIED")

		return user
	
	@staticmethod
	def verify_email(db: Session, token: str) -> Optional[User]:
		user = db.query(User).filter(User.verification_token == token).first()

		if not user:
			raise ValueError("Invalid verification link.")
		
		if user.verification_token_expires < datetime.now(timezone.utc):
			raise ValueError("Verification link has expired. Please request a new one.")
		
		user.is_verified = True
		user.verification_token = None
		user.verification_token_expires = None
		db.commit()
		db.refresh(user)
		return user
	
	@staticmethod
	def resend_verification(db: Session, email:str) -> None:
		user = db.query(User).filter(User.email == email).first()

		if not user:
			return
		
		if user.is_verified:
			raise ValueError("This email is already verified.")
		
		token, expires = EmailService.generate_verification_token()
		user.verification_token = token
		user.verification_token_expires = expires
		db.commit()

		EmailService.send_verification_email(user.email, user.username, token)

	@staticmethod
	def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
		if not verify_password(current_password, user.hashed_password):
			raise ValueError("Incorrect current password")
			
		user.hashed_password = hash_password(new_password)
		db.commit()
		return True
	
	@staticmethod
	def reset_forgotten_password(db: Session, username: str, old_password: str, new_password: str) -> bool:
		user = db.query(User).filter(User.username == username).first()
		if not user:
			raise ValueError("Invalid username or old password")

		if not verify_password(old_password, user.hashed_password):
			raise ValueError("Invalid username or old password")
		
		hashed_pwd = hash_password(new_password)
		user.hashed_password = hashed_pwd
		db.commit()
		return True
	
	@staticmethod
	def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
		return db.query(User).filter(User.id == user_id).first()
	
	@staticmethod
	def get_user_by_username(db: Session, username: str) -> Optional[User]:
		return db.query(User).filter(User.username == username).first()

	@staticmethod
	def update_user(
		db: Session,
		user: User,
		username: Optional[str] = None,
		telegram_notifications_enabled: Optional[bool] = None,
	) -> User:
		if username is not None and username != user.username:
			conflict = db.query(User).filter(User.username == username).first()
			if conflict:
				raise ValueError("Username already taken")
			user.username = username
		if telegram_notifications_enabled is not None:
			user.telegram_notifications_enabled = telegram_notifications_enabled
		try:
			db.commit()
			db.refresh(user)
			return user
		except IntegrityError:
			db.rollback()
			raise ValueError("Username already taken")
