from sqlalchemy import Column, Float, Index, JSON, String

from app.db.session import Base


class TelegramState(Base):
    __tablename__ = "telegram_state"

    key = Column(String(100), primary_key=True)
    payload = Column(JSON, nullable=False)
    expires_at = Column(Float, nullable=False)

    __table_args__ = (Index("idx_telegram_state_expires_at", "expires_at"),)
