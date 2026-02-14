from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Goal(Base):
    """Financial goal model"""
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    icon = Column(String(20), nullable=False, default="🎯")  # Emoji icon for the goal
    target_amount = Column(Float, nullable=False)  # Target amount in MAD
    current_amount = Column(Float, default=0.0)  # Current saved amount in MAD
    deadline = Column(Date, nullable=True)  # Optional deadline
    category = Column(String(50), nullable=True)  # e.g., "Emergency Fund", "Travel", "Investment"
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationship
    user = relationship("User", back_populates="goals")

    def __repr__(self):
        return f"<Goal {self.name} - {self.current_amount}/{self.target_amount} MAD>"
