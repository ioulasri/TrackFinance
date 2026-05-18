"""
Telegram Bot Routes

- POST /v1/telegram/webhook       — receives Telegram updates (validated by secret header)
- POST /v1/telegram/link-code     — authenticated: generate a one-time link code
- GET  /v1/telegram/status        — authenticated: is this user's account linked?
- DELETE /v1/telegram/link        — authenticated: unlink Telegram from this account
"""

from __future__ import annotations

import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import telegram_service
from app.services.chat_service import FinanceChatService
from app.services.telegram_service import TelegramService


router = APIRouter(prefix="/v1/telegram", tags=["telegram"])


# ============================================================
# Schemas
# ============================================================

class LinkCodeResponse(BaseModel):
	code: str
	expires_at: datetime
	deeplink: str
	bot_username: Optional[str] = None


class StatusResponse(BaseModel):
	linked: bool
	chat_id_masked: Optional[str] = None


class GenericOk(BaseModel):
	ok: bool = True
	message: Optional[str] = None


# ============================================================
# Helpers
# ============================================================

def _mask_chat_id(chat_id: Optional[str]) -> Optional[str]:
	if not chat_id:
		return None
	if len(chat_id) <= 4:
		return "*" * len(chat_id)
	return "*" * (len(chat_id) - 4) + chat_id[-4:]


def _bot_username() -> str:
	return os.getenv("TELEGRAM_BOT_USERNAME", "").lstrip("@")


HELP_TEXT = (
	"👋 *TrackFinance Assistant*\n\n"
	"Once your account is linked, just message me naturally:\n"
	"• `I spent 50 MAD on lunch`\n"
	"• `How much did I spend on food this month?`\n"
	"• `Set a goal to save 1000 MAD for a laptop`\n"
	"• `Show my budgets`\n\n"
	"Commands:\n"
	"`/start <code>` — link this chat to your TrackFinance account (get the code at expensehub.site → Settings → Telegram)\n"
	"`/unlink` — disconnect this chat from your account\n"
	"`/help` — show this message"
)


def _process_chat_message(user: User, text: str, db: Session) -> str:
	"""Run the AI chat service for a linked user and return the reply text."""
	history = telegram_service.get_history(user.id)
	try:
		chat_service = FinanceChatService()
	except ValueError:
		return "⚠️ The AI service is not configured on the server (missing GROQ_API_KEY). Please contact the admin."
	result = chat_service.chat(
		user_message=text,
		user_id=user.id,
		db=db,
		conversation_history=history,
	)
	telegram_service.update_history(user.id, result.get("conversation_history") or [])
	return result.get("response") or "Sorry, I don't have a response for that."


def _handle_start_with_code(code: str, chat_id: str, db: Session) -> str:
	"""Consume a one-time link code and bind this chat_id to the matching user."""
	now = datetime.now(timezone.utc)
	user = (
		db.query(User)
		.filter(
			User.telegram_link_code == code,
			User.telegram_link_code_expires.isnot(None),
			User.telegram_link_code_expires > now,
		)
		.first()
	)
	if not user:
		return "❌ Invalid or expired code. Generate a new one at *expensehub.site → Settings → Telegram*."

	# If another user is already linked to this chat_id, unlink them first.
	existing = db.query(User).filter(User.telegram_chat_id == str(chat_id), User.id != user.id).first()
	if existing:
		existing.telegram_chat_id = None

	user.telegram_chat_id = str(chat_id)
	user.telegram_link_code = None
	user.telegram_link_code_expires = None
	db.commit()
	telegram_service.clear_history(user.id)

	display = user.username or user.email or "your account"
	return (
		f"✅ Linked to *{display}*!\n\n"
		"Try: _I spent 50 MAD on lunch_ or _How much did I spend this month?_\n"
		"Type /help any time."
	)


def _handle_unlink(chat_id: str, db: Session) -> str:
	user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
	if not user:
		return "This chat isn't linked to any account."
	user.telegram_chat_id = None
	db.commit()
	telegram_service.clear_history(user.id)
	return "🔌 Unlinked. You can re-link any time from Settings → Telegram."


def _handle_update(update: Dict[str, Any], db: Session) -> Optional[str]:
	"""
	Translate one Telegram update into a reply string. Returns None when no
	reply should be sent (e.g. non-message updates, empty text).
	"""
	message = update.get("message") or update.get("edited_message")
	if not message:
		return None
	chat = message.get("chat") or {}
	chat_id_raw = chat.get("id")
	if chat_id_raw is None:
		return None
	chat_id = str(chat_id_raw)
	text = (message.get("text") or "").strip()
	if not text:
		return "I can only read text messages right now."

	if text.startswith("/start ") or text.startswith("/link "):
		code = text.split(maxsplit=1)[1].strip()
		return _handle_start_with_code(code, chat_id, db)
	if text in ("/start", "/help"):
		return HELP_TEXT
	if text == "/unlink":
		return _handle_unlink(chat_id, db)

	user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
	if not user:
		username = _bot_username()
		hint = f" (https://t.me/{username})" if username else ""
		return (
			"🔒 This chat isn't linked yet.\n"
			f"Open *expensehub.site → Settings → Telegram*, generate a code, then send it back here as `/start <code>`{hint}."
		)

	return _process_chat_message(user, text, db)


# ============================================================
# Webhook (Telegram → us)
# ============================================================

@router.post("/webhook")
async def telegram_webhook(
	request: Request,
	db: Session = Depends(get_db),
	x_telegram_bot_api_secret_token: Optional[str] = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
):
	"""
	Telegram posts updates here. We always return 200 (even on internal errors)
	so Telegram doesn't enter an exponential-retry loop against us.
	"""
	expected = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
	if not expected:
		# Misconfigured server — reject so the operator notices in setWebhook logs.
		raise HTTPException(status_code=503, detail="Telegram webhook secret not configured")
	if not x_telegram_bot_api_secret_token or not hmac.compare_digest(x_telegram_bot_api_secret_token, expected):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid secret token")

	try:
		update = await request.json()
	except Exception:
		return {"ok": True}

	try:
		reply = _handle_update(update, db)
	except Exception as e:
		print(f"[telegram] handler error: {e}")
		reply = None
		try:
			db.rollback()
		except Exception:
			pass

	if reply:
		message = update.get("message") or update.get("edited_message") or {}
		chat_id = (message.get("chat") or {}).get("id")
		if chat_id is not None:
			TelegramService.send_message(chat_id, reply)

	return {"ok": True}


# ============================================================
# Authenticated linking endpoints (frontend → us)
# ============================================================

@router.post("/link-code", response_model=LinkCodeResponse)
def generate_link_code(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	code = secrets.token_urlsafe(6)[:8]
	expires = datetime.now(timezone.utc) + timedelta(minutes=10)
	current_user.telegram_link_code = code
	current_user.telegram_link_code_expires = expires
	db.commit()

	bot_username = _bot_username()
	deeplink = f"https://t.me/{bot_username}?start={code}" if bot_username else f"https://t.me/?start={code}"
	return LinkCodeResponse(
		code=code,
		expires_at=expires,
		deeplink=deeplink,
		bot_username=bot_username or None,
	)


@router.get("/status", response_model=StatusResponse)
def telegram_status(current_user: User = Depends(get_current_user)):
	return StatusResponse(
		linked=bool(current_user.telegram_chat_id),
		chat_id_masked=_mask_chat_id(current_user.telegram_chat_id),
	)


@router.delete("/link", response_model=GenericOk)
def unlink_telegram(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	had_chat = current_user.telegram_chat_id
	current_user.telegram_chat_id = None
	current_user.telegram_link_code = None
	current_user.telegram_link_code_expires = None
	db.commit()
	telegram_service.clear_history(current_user.id)

	# Best-effort courtesy notification to the bot chat.
	if had_chat:
		try:
			TelegramService.send_message(
				had_chat,
				"🔌 Your TrackFinance account was unlinked from this chat via the web app.",
			)
		except Exception:
			pass

	return GenericOk(ok=True, message="Unlinked" if had_chat else "Was not linked")
