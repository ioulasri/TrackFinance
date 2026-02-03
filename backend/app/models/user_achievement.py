from sqlalchemy import Column, Integer, String, TIMESTAMP, Boolean, DECIMAL, CheckConstraint, UniqueConstraint, ForeignKey, Index, text
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime, timezone
from app.models import achievement

class UserAchievement(Base):
	__tablename__ = "user_achievements"

	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False)
	achievement_id = Column(Integer, ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True, nullable=False)

	unlocked_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
	progress = Column(Integer, default=0)

	user = relationship("User", back_populates="user_achievements")
	achievement = relationship("Achievement", back_populates="user_achievements")

	__table_args__ = (
		CheckConstraint("progress >= 0", name="ck_progress_amount"),
		CheckConstraint("progress <= 100", name="ck_progress_max"),
		Index('idx_user_achievements_user_id', 'user_id'),
		Index('idx_user_achievements_achievement_id', 'achievement_id'),
		Index('idx_user_achievements_unlocked_at', 'unlocked_at'),
	)