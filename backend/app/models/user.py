from sqlalchemy import Column, Integer, String, TIMESTAMP, Boolean, DECIMAL, CheckConstraint, ForeignKey, Index, text
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), unique=True, nullable=False)
    username = Column(String(50))
    total_xp = Column(Integer, nullable=False, server_default=text("0"))
    current_level = Column(Integer, nullable=False, server_default=text("0"))
    current_streak = Column(Integer, nullable=False, server_default=text("0"))
    longest_streak = Column(Integer, nullable=False, server_default=text("0"))
    last_activity_date = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    __table_args__ = (
        CheckConstraint("total_xp >= 0", name="ck_users_total_xp_non_negative"),
        Index("idx_users_email", "email"),
        Index("idx_users_username", "username")
    )

    # relationships ...