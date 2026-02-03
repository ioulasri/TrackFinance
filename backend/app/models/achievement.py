from sqlalchemy import Column, Integer, String, TIMESTAMP, Boolean, DECIMAL, CheckConstraint, ForeignKey, Index, text, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base
from enum import Enum as PyEnum

class Achievement(Base):
	__tablename__ = "achievements"

	id = Column(Integer, primary_key=True)

	name = Column(String(100), unique=True, nullable=False)
	description = Column(String(255), nullable=False)
	icon = Column(String(100))
	xp_reward = Column(Integer, nullable=False)
	category = Column(String(50), nullable=False)
	requirement_type = Column(String(50), nullable=False)
	requirement_value = Column(Integer, nullable=False)
	created_at = Column(TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"))

	user_achievements = relationship("UserAchievement", back_populates="achievement")
	
	__table_args__ = (
		CheckConstraint("xp_reward >= 0", name="ck_xp_reward_amount"),
		CheckConstraint("requirement_value > 0", name="ck_requirement_value"),
		Index("idx_achievements_category", "category"),
		Index("idx_achievements_name", "name"),
	)