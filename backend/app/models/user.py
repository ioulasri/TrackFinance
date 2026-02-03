from sqlalchemy import Column, Integer, String, TIMESTAMP, Boolean, DECIMAL, CheckConstraint, ForeignKey, Index, text
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime, timezone
from app.models import user_achievement

class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key=True)
	email = Column(String(255), unique=True, nullable=False)
	hashed_password = Column(String(255), nullable=False)
	username = Column(String(50))
	total_xp = Column(Integer, nullable=False, server_default=text("0"))
	current_level = Column(Integer, nullable=False, server_default=text("0"))
	current_streak = Column(Integer, nullable=False, server_default=text("0"))
	longest_streak = Column(Integer, nullable=False, server_default=text("0"))
	last_activity_date = Column(TIMESTAMP(timezone=True))
	created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
	updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

	__table_args__ = (
		CheckConstraint("total_xp >= 0", name="ck_users_total_xp_non_negative"),
		Index("idx_users_email", "email"),
		Index("idx_users_username", "username")
	)

	transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
	user_achievements = relationship("UserAchievement", back_populates="user")
	budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")