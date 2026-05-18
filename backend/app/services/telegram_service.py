"""
Telegram Service

Adapter that lets users interact with the TrackFinance AI assistant via a
Telegram bot. The heavy lifting is delegated to FinanceChatService — this
module only handles Telegram I/O, account linking, and conversation history.

Public surface:
  TelegramService.send_message(chat_id, text)
  TelegramService.set_webhook(url, secret) / delete_webhook() / get_webhook_info()
  get_history(user_id) / update_history(user_id, history) / clear_history(user_id)
"""

from __future__ import annotations

import os
import time
from typing import Dict, List, Optional, Tuple

import httpx


TELEGRAM_API_BASE = "https://api.telegram.org"
_HISTORY_TTL_SECONDS = 30 * 60  # 30 minutes
_HISTORY_MAX_MESSAGES = 20

# In-memory per-user history: {user_id: (last_used_ts, [{"role": ..., "content": ...}])}
_HISTORY: Dict[int, Tuple[float, List[Dict[str, str]]]] = {}


def _bot_token() -> str:
	token = os.getenv("TELEGRAM_BOT_TOKEN")
	if not token:
		raise RuntimeError("TELEGRAM_BOT_TOKEN environment variable is not set.")
	return token


def _api_url(method: str, token: Optional[str] = None) -> str:
	return f"{TELEGRAM_API_BASE}/bot{token or _bot_token()}/{method}"


# ============================================================
# Conversation history (in-memory)
# ============================================================

def _evict_expired() -> None:
	now = time.time()
	stale = [uid for uid, (ts, _) in _HISTORY.items() if now - ts > _HISTORY_TTL_SECONDS]
	for uid in stale:
		_HISTORY.pop(uid, None)


def get_history(user_id: int) -> List[Dict[str, str]]:
	_evict_expired()
	entry = _HISTORY.get(user_id)
	if not entry:
		return []
	return list(entry[1])


def update_history(user_id: int, history: List[Dict[str, str]]) -> None:
	trimmed = history[-_HISTORY_MAX_MESSAGES:] if history else []
	_HISTORY[user_id] = (time.time(), trimmed)


def clear_history(user_id: int) -> None:
	_HISTORY.pop(user_id, None)


# ============================================================
# Telegram API client
# ============================================================

class TelegramService:
	"""Minimal Telegram Bot API client. All methods are static — no state."""

	@staticmethod
	def send_message(chat_id: str | int, text: str, parse_mode: Optional[str] = "Markdown") -> Dict:
		"""
		Send a text message to a Telegram chat. Errors are logged and swallowed
		so a downstream failure never crashes the webhook handler.
		"""
		payload = {"chat_id": chat_id, "text": text}
		if parse_mode:
			payload["parse_mode"] = parse_mode
			payload["disable_web_page_preview"] = True
		try:
			with httpx.Client(timeout=10.0) as client:
				resp = client.post(_api_url("sendMessage"), json=payload)
				if resp.status_code >= 400:
					# Markdown parse errors return 400 — retry as plain text once.
					if parse_mode:
						retry = client.post(
							_api_url("sendMessage"),
							json={"chat_id": chat_id, "text": text},
						)
						return retry.json() if retry.status_code < 500 else {"ok": False}
					return {"ok": False, "status": resp.status_code, "body": resp.text}
				return resp.json()
		except Exception as e:
			print(f"[telegram] send_message failed: {e}")
			return {"ok": False, "error": str(e)}

	@staticmethod
	def set_webhook(url: str, secret: str, token: Optional[str] = None) -> Dict:
		"""Register the webhook URL with Telegram. Idempotent — safe to re-run."""
		with httpx.Client(timeout=10.0) as client:
			resp = client.post(
				_api_url("setWebhook", token=token),
				json={
					"url": url,
					"secret_token": secret,
					"allowed_updates": ["message"],
					"drop_pending_updates": True,
				},
			)
			return resp.json()

	@staticmethod
	def delete_webhook(token: Optional[str] = None) -> Dict:
		with httpx.Client(timeout=10.0) as client:
			resp = client.post(_api_url("deleteWebhook", token=token))
			return resp.json()

	@staticmethod
	def get_webhook_info(token: Optional[str] = None) -> Dict:
		with httpx.Client(timeout=10.0) as client:
			resp = client.get(_api_url("getWebhookInfo", token=token))
			return resp.json()

	@staticmethod
	def get_updates(offset: Optional[int] = None, timeout: int = 25, token: Optional[str] = None) -> Dict:
		"""Long-polling fallback for local debugging. Not used in production."""
		params: Dict = {"timeout": timeout, "allowed_updates": ["message"]}
		if offset is not None:
			params["offset"] = offset
		with httpx.Client(timeout=timeout + 5) as client:
			resp = client.get(_api_url("getUpdates", token=token), params=params)
			return resp.json()
