from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.achievement import Achievement
from app.models.user import User
from typing import List, Optional
from app.models.user_achievement import UserAchievement
from datetime import datetime, timezone

class AchievementService:
	"""Handles achievement logic"""

	@staticmethod
	def list_achievements(db: Session, skip: int = 0, limit: int = 0) -> List[Achievement]:
		return db.query(Achievement).offset(skip).limit(limit).all()

	@staticmethod
	def list_user_achievements(db: Session, user_id: int, skip: int = 0, limit: int = 0) -> List[UserAchievement]:
		return db.query(UserAchievement).filter(
			UserAchievement.user_id == user_id
		).offset(skip).limit(limit).all()
	
	@staticmethod
	def get_achievement_by_id(db: Session, achievement_id: int) -> Optional[Achievement]:
		return db.query(Achievement).filter(
			Achievement.id == achievement_id
		).first()
	
	@staticmethod
	def check_and_unlock_achievement(
		db: Session,
		user_id: int,
		achievement_id: int,
		progress: int = 100
	) -> Optional[UserAchievement]:
		try:
			existing = db.query(UserAchievement).filter(
				UserAchievement.user_id == user_id,
				UserAchievement.achievement_id == achievement_id
			).first()

			if existing:
				return None
			
			achievement = db.query(Achievement).filter(
				Achievement.id == achievement_id
			).first()

			if not achievement:
				return None
			
			user_achievement = UserAchievement(
				user_id=user_id,
				achievement_id=achievement_id,
				progress=progress,
				unlocked_at=datetime.now(timezone.utc)
			)

			db.add(user_achievement)

			user = db.query(User).filter(User.id == user_id).first()

			if user:
				user.total_xp += achievement.xp_reward

			db.commit()
			db.refresh(user_achievement)

			# Best-effort Telegram DM (no-ops if not linked or notifications off).
			if user and achievement:
				try:
					from app.services import notification_service
					notification_service.notify(
						user,
						f"🏆 *Achievement unlocked!*\n"
						f"{achievement.icon or '🎖'} *{achievement.name}*\n"
						f"_{achievement.description}_\n"
						f"+{achievement.xp_reward} XP",
					)
				except Exception as e:
					print(f"[achievements] DM failed for user {user.id}: {e}")

			return user_achievement

		except IntegrityError:
			db.rollback()
			return None
		
	@staticmethod
	def update_achievement_progress(
		db: Session,
		user_id: int,
		achievement_id: int,
		progress: int
	) -> Optional[UserAchievement]:
		user_achievement = db.query(UserAchievement).filter(
			UserAchievement.user_id == user_id,
			UserAchievement.achievement_id == achievement_id
		).first()

		if user_achievement:
			user_achievement.progress = min(progress, 100)
			db.commit()
			db.refresh(user_achievement)

		return user_achievement
	
	@staticmethod
	def get_user_achievement_stats(db: Session, user_id: int) -> dict:
		total_achievements = db.query(Achievement).count()
		unlocked_count = db.query(UserAchievement).filter(
			UserAchievement.user_id == user_id
		).count()

		return {
			"total_achievements": total_achievements,
			"unlocked_count": unlocked_count,
			"completion_percentage": round((unlocked_count / total_achievements * 100), 2) if total_achievements > 0 else 0
		}
	
	@staticmethod
	def check_achievement_requirements(
		db: Session,
		user_id: int,
		requirement_type: str,
		current_value: int
	) -> List[Achievement]:
		unlocked_ids = db.query(UserAchievement.achievement_id).filter(
			UserAchievement.user_id == user_id
		).subquery()

		eligible_achievements = db.query(Achievement).filter(
			Achievement.requirement_type == requirement_type,
			Achievement.requirement_value <= current_value,
			Achievement.id.notin_(unlocked_ids)
		).all()

		return eligible_achievements
	
	

