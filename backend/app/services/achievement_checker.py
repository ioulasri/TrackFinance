from sqlalchemy.orm import Session
from app.services.achievement_services import AchievementService
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from datetime import datetime, timezone
from typing import List
from app.models.achievement import Achievement

class AchievementChecker:

	@staticmethod
	def check_transaction_achievements(db: Session, user_id: int, transaction: Transaction):

		total_transactions = db.query(Transaction).filter(
			Transaction.user_id == user_id,
			Transaction.is_deleted == False
		).count()

		eligible = AchievementService.check_achievement_requirements(
			db, user_id, "transaction_count", total_transactions
		)

		for achievement in eligible:
			AchievementService.check_and_unlock_achievement(
				db, user_id, achievement.id
			)

		if transaction.description:
			described_count = db.query(Transaction).filter(
				Transaction.user_id == user_id,
				Transaction.description.isnot(None),
				Transaction.is_deleted == False
			).count()

			eligible = AchievementService.check_achievement_requirements(
				db, user_id, "described_transactions", described_count
			)

			for achievement in eligible:
				AchievementService.check_and_unlock_achievement(
					db, user_id, achievement.id
				)

		hour = transaction.date.hour
		if hour < 8:
			eligible = AchievementService.check_achievement_requirements(
				db, user_id, "early_transaction", 1
			)
			for achievement in eligible:
				AchievementService.check_and_unlock_achievement(
					db, user_id, achievement.id
				)
			
		if hour >= 22:
			eligible = AchievementService.check_achievement_requirements(
				db, user_id, "late_transaction", 1
			)
			for achievement in eligible:
				AchievementService.check_and_unlock_achievement(
					db, user_id, achievement.id
				)
			
		if transaction.type == 'income':
			income_count = db.query(Transaction).filter(
				Transaction.user_id == user_id,
				Transaction.type == "income",
				Transaction.is_deleted == False
			).count()

			eligible = AchievementService.check_achievement_requirements(
				db, user_id, "income_count"
			)

			for achievement in eligible:
				AchievementService.check_and_unlock_achievement(
					db, user_id, achievement.id
				)

	@staticmethod
	def check_budget_achievements(db: Session, user_id: int):

		budget_count = db.query(Budget).filter(
			Budget.user_id == user_id
		).count()

		eligible = AchievementService.check_achievement_requirements(
			db, user_id, "budget_count", budget_count
		)

		for achievement in eligible:
			AchievementService.check_and_unlock_achievement(
				db, user_id, achievement.id
			)

	@staticmethod
	def check_streak_achievements(db: Session, user_id: int, current_streak: int):

		eligible = AchievementService.check_achievement_requirements(
			db, user_id, "daily_streak", current_streak
		)

		for achievement in eligible:
			AchievementService.check_and_unlock_achievement(
				db, user_id, achievement.id
			)

	@staticmethod
	def check_account_age_achievements(db: Session, user_id: int):

		user = db.query(User).filter(User.id == user_id).first()

		if not user:
			return
		
		account_age_days = (datetime.now(timezone.utc) - user.created_at).days

		eligible = AchievementService.check_achievement_requirements(
			db, user_id, "account_age_days", account_age_days
		)

		for achievement in eligible:
			AchievementService.check_and_unlock_achievement(
				db, user_id, achievement.id
			)

		