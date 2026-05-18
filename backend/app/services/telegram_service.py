"""
Telegram Service

Adapter that lets users interact with TrackFinance via a Telegram bot. AI is
delegated to FinanceChatService; this module owns Telegram I/O, account linking,
in-memory conversation history (for AI), and the in-memory wizard state machine
that powers the interactive command UI (/add, /budgets, etc.).

Public surface:
  TelegramService — static methods wrapping Telegram Bot API
    send_message(chat_id, text, reply_markup=...)
    edit_message_text(chat_id, message_id, text, reply_markup=...)
    answer_callback_query(callback_query_id, text=...)
    set_webhook(url, secret) / delete_webhook() / get_webhook_info()
    set_my_commands(commands)
    get_updates(offset, timeout)         # debug/polling

  Conversation history (AI):
    get_history(user_id) / update_history(user_id, history) / clear_history(user_id)

  Wizard state (interactive UI):
    get_wizard(chat_id) / set_wizard(chat_id, flow, step, data) / clear_wizard(chat_id)
    update_wizard_data(chat_id, **kwargs) / set_wizard_step(chat_id, step)
"""

from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx


TELEGRAM_API_BASE = "https://api.telegram.org"

_HISTORY_TTL_SECONDS = 30 * 60   # AI conversation history
_HISTORY_MAX_MESSAGES = 20

_WIZARD_TTL_SECONDS = 10 * 60    # interactive command wizard state

# In-memory per-user AI history: {user_id: (last_used_ts, [{"role": ..., "content": ...}])}
_HISTORY: Dict[int, Tuple[float, List[Dict[str, str]]]] = {}

# In-memory per-chat wizard state: {chat_id: {"flow": str, "step": str, "data": dict, "ts": float}}
_WIZARDS: Dict[str, Dict[str, Any]] = {}


def _bot_token() -> str:
	token = os.getenv("TELEGRAM_BOT_TOKEN")
	if not token:
		raise RuntimeError("TELEGRAM_BOT_TOKEN environment variable is not set.")
	return token


def _api_url(method: str, token: Optional[str] = None) -> str:
	return f"{TELEGRAM_API_BASE}/bot{token or _bot_token()}/{method}"


# ============================================================
# Conversation history (AI, in-memory)
# ============================================================

def _evict_expired_history() -> None:
	now = time.time()
	stale = [uid for uid, (ts, _) in _HISTORY.items() if now - ts > _HISTORY_TTL_SECONDS]
	for uid in stale:
		_HISTORY.pop(uid, None)


def get_history(user_id: int) -> List[Dict[str, str]]:
	_evict_expired_history()
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
# Wizard state (interactive UI, in-memory)
# ============================================================

def _evict_expired_wizards() -> None:
	now = time.time()
	stale = [cid for cid, w in _WIZARDS.items() if now - w.get("ts", 0) > _WIZARD_TTL_SECONDS]
	for cid in stale:
		_WIZARDS.pop(cid, None)


def get_wizard(chat_id: str | int) -> Optional[Dict[str, Any]]:
	_evict_expired_wizards()
	return _WIZARDS.get(str(chat_id))


def set_wizard(chat_id: str | int, flow: str, step: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
	state = {"flow": flow, "step": step, "data": dict(data or {}), "ts": time.time()}
	_WIZARDS[str(chat_id)] = state
	return state


def set_wizard_step(chat_id: str | int, step: str) -> Optional[Dict[str, Any]]:
	w = _WIZARDS.get(str(chat_id))
	if not w:
		return None
	w["step"] = step
	w["ts"] = time.time()
	return w


def update_wizard_data(chat_id: str | int, **kwargs: Any) -> Optional[Dict[str, Any]]:
	w = _WIZARDS.get(str(chat_id))
	if not w:
		return None
	w["data"].update(kwargs)
	w["ts"] = time.time()
	return w


def clear_wizard(chat_id: str | int) -> None:
	_WIZARDS.pop(str(chat_id), None)


# ============================================================
# Telegram API client
# ============================================================

class TelegramService:
	"""Minimal Telegram Bot API client. All methods are static — no state."""

	@staticmethod
	def send_message(
		chat_id: str | int,
		text: str,
		parse_mode: Optional[str] = "Markdown",
		reply_markup: Optional[Dict[str, Any]] = None,
	) -> Dict:
		"""
		Send a text message. Errors are logged and swallowed so a downstream
		failure never crashes the webhook handler.
		"""
		payload: Dict[str, Any] = {"chat_id": chat_id, "text": text}
		if parse_mode:
			payload["parse_mode"] = parse_mode
			payload["disable_web_page_preview"] = True
		if reply_markup is not None:
			payload["reply_markup"] = reply_markup
		try:
			with httpx.Client(timeout=10.0) as client:
				resp = client.post(_api_url("sendMessage"), json=payload)
				if resp.status_code >= 400 and parse_mode:
					# Markdown parse errors return 400 — retry as plain text once.
					plain = {"chat_id": chat_id, "text": text}
					if reply_markup is not None:
						plain["reply_markup"] = reply_markup
					retry = client.post(_api_url("sendMessage"), json=plain)
					return retry.json() if retry.status_code < 500 else {"ok": False}
				if resp.status_code >= 400:
					return {"ok": False, "status": resp.status_code, "body": resp.text}
				return resp.json()
		except Exception as e:
			print(f"[telegram] send_message failed: {e}")
			return {"ok": False, "error": str(e)}

	@staticmethod
	def edit_message_text(
		chat_id: str | int,
		message_id: int,
		text: str,
		parse_mode: Optional[str] = "Markdown",
		reply_markup: Optional[Dict[str, Any]] = None,
	) -> Dict:
		"""Edit a previously-sent message in place. Used to update the bot's reply after a button tap."""
		payload: Dict[str, Any] = {"chat_id": chat_id, "message_id": message_id, "text": text}
		if parse_mode:
			payload["parse_mode"] = parse_mode
			payload["disable_web_page_preview"] = True
		if reply_markup is not None:
			payload["reply_markup"] = reply_markup
		try:
			with httpx.Client(timeout=10.0) as client:
				resp = client.post(_api_url("editMessageText"), json=payload)
				if resp.status_code >= 400 and parse_mode:
					plain = {"chat_id": chat_id, "message_id": message_id, "text": text}
					if reply_markup is not None:
						plain["reply_markup"] = reply_markup
					retry = client.post(_api_url("editMessageText"), json=plain)
					return retry.json() if retry.status_code < 500 else {"ok": False}
				return resp.json()
		except Exception as e:
			print(f"[telegram] edit_message_text failed: {e}")
			return {"ok": False, "error": str(e)}

	@staticmethod
	def answer_callback_query(callback_query_id: str, text: Optional[str] = None) -> Dict:
		"""Acknowledge a callback_query so Telegram stops the spinner on the user's button."""
		payload: Dict[str, Any] = {"callback_query_id": callback_query_id}
		if text:
			payload["text"] = text[:200]
		try:
			with httpx.Client(timeout=5.0) as client:
				resp = client.post(_api_url("answerCallbackQuery"), json=payload)
				return resp.json()
		except Exception as e:
			print(f"[telegram] answer_callback_query failed: {e}")
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
					"allowed_updates": ["message", "callback_query"],
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
	def set_my_commands(commands: List[Dict[str, str]], token: Optional[str] = None) -> Dict:
		"""
		Register the bot's slash-command menu (shown in the Telegram UI's left-of-input
		menu icon). `commands` is a list of {"command": "balance", "description": "..."}.
		"""
		with httpx.Client(timeout=10.0) as client:
			resp = client.post(_api_url("setMyCommands", token=token), json={"commands": commands})
			return resp.json()

	@staticmethod
	def get_updates(
		offset: Optional[int] = None,
		timeout: int = 25,
		token: Optional[str] = None,
	) -> Dict:
		"""Long-polling fallback for local debugging. Not used in production."""
		params: Dict[str, Any] = {
			"timeout": timeout,
			"allowed_updates": ["message", "callback_query"],
		}
		if offset is not None:
			params["offset"] = offset
		with httpx.Client(timeout=timeout + 5) as client:
			resp = client.get(_api_url("getUpdates", token=token), params=params)
			return resp.json()
