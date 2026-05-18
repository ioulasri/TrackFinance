"""
Outbound notification helpers — Telegram DMs that respect the user's
notification preference and gracefully no-op when the user isn't linked.

All sends are best-effort: any error is logged and swallowed so a notification
failure never breaks the calling business logic.
"""

from __future__ import annotations

from typing import Optional

from app.models.user import User
from app.services.telegram_service import TelegramService


def can_dm(user: Optional[User]) -> bool:
	"""True iff this user has a linked Telegram chat and notifications are on."""
	if user is None:
		return False
	if not getattr(user, "telegram_chat_id", None):
		return False
	# Older users (pre-migration) may not have the column; default to True.
	return bool(getattr(user, "telegram_notifications_enabled", True))


def notify(user: Optional[User], text: str, reply_markup: Optional[dict] = None) -> bool:
	"""Send a Telegram DM to the user iff opted in. Returns True if attempted."""
	if not can_dm(user):
		return False
	try:
		TelegramService.send_message(user.telegram_chat_id, text, reply_markup=reply_markup)
		return True
	except Exception as e:
		print(f"[notify] DM to user {user.id} failed: {e}")
		return False
