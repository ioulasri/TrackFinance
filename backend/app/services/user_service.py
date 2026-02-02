from multiprocessing import Value
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password, verify_password, create_access_token
from typing import Optional

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

		new_user = User(
			email=user_data.email,
			username=user_data.username,
			hashed_password=hashed_pwd,
			total_xp=0,
			current_level=0,
			current_streak=0,
			longest_streak=0
		)

		try:
			db.add(new_user)
			db.commit()
			db.refresh(new_user)
			return new_user
		except IntegrityError:
			db.rollback()
			raise ValueError("Database constraint violation")


	@staticmethod
	def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:

		user = db.query(User).filter(User.username == username).first()

		if not user:
			return None
	
		if not verify_password(password, user.hashed_password):
			return None

		return user
	
	@staticmethod
	def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
		return db.query(User).filter(User.id == user_id).first()
	
	@staticmethod
	def get_user_by_username(db: Session, username: str) -> Optional[User]:
		return db.query(User).filter(User.username == username).first()
