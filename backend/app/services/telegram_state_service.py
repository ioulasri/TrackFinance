"""Short-lived Telegram state shared by serverless instances."""

import time

from app.db.session import SessionLocal
from app.models.telegram_state import TelegramState


def get_state(key: str):
    with SessionLocal() as db:
        row = db.get(TelegramState, key)
        if row is None:
            return None
        if row.expires_at <= time.time():
            db.delete(row)
            db.commit()
            return None
        return row.payload


def put_state(key: str, payload, ttl_seconds: int) -> None:
    with SessionLocal() as db:
        db.merge(TelegramState(key=key, payload=payload, expires_at=time.time() + ttl_seconds))
        db.commit()


def delete_state(key: str) -> None:
    with SessionLocal() as db:
        db.query(TelegramState).filter(TelegramState.key == key).delete()
        db.commit()


def delete_expired(db) -> None:
    db.query(TelegramState).filter(TelegramState.expires_at <= time.time()).delete()
    db.commit()
