from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.services.user_service import UserService
from math import sqrt, floor

class XPService:
	"""Handles XP logic"""

	@staticmethod
	def calculate_level(total_xp: int) -> int:
		return floor(sqrt(total_xp / 100))
	
	@staticmethod
	def get_xp_for_next_level(current_level: int) -> int:
		return ((current_level + 1) ** 2) * 100

	@staticmethod
	def award_xp(db: Session, user_id: int, amount: int) -> Optional[User]:
		user = UserService.get_user_by_id(db, user_id)

		if not user:
			return None
		
		user.total_xp += amount

		user.current_level = XPService.calculate_level(user.total_xp)

		now = datetime.now(timezone.utc)
		if user.last_activity_date:
			last_activity_aware = user.last_activity_date.replace(tzinfo=timezone.utc)
			hours_since_last = (now - last_activity_aware).total_seconds() / 3600
			if hours_since_last > 48:
				user.current_streak = 1
			elif last_activity_aware.date() < now.date():
				user.current_streak += 1
				if user.current_streak > user.longest_streak:
					user.longest_streak = user.current_streak
		else:
			user.current_streak = 1
			user.longest_streak = 1

		user.last_activity_date = now.replace(tzinfo=None) 

		try:
			db.commit()
			db.refresh(user)
			return user
		except IntegrityError:
			db.rollback()
			return None
		except Exception:
			db.rollback()
			raise ValueError("Database constraint violation")
	
