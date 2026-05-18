"""
Telegram long-polling debug runner.

For local development only — production uses the webhook registered by
`setup_telegram_webhook.py`. Polling and a webhook cannot be active at the
same time, so this script deletes the webhook on startup and re-registers it
when you press Ctrl-C (if TELEGRAM_WEBHOOK_SECRET and BACKEND_URL are set).

Usage:
    python -m app.scripts.telegram_polling

This wires Telegram updates into the same handler the webhook uses, so the
linking flow, /help, /unlink and AI chat all behave identically.
"""

import os
import signal
import sys
import time

from app.db.session import SessionLocal
from app.services.telegram_service import TelegramService
from app.api.routes.telegram import _handle_update


def _restore_webhook() -> None:
	secret = os.getenv("TELEGRAM_WEBHOOK_SECRET")
	backend_url = os.getenv("BACKEND_URL")
	if secret and backend_url:
		url = backend_url.rstrip("/") + "/v1/telegram/webhook"
		print(f"\nRestoring webhook: {url}")
		print(TelegramService.set_webhook(url, secret))


def main() -> int:
	if not os.getenv("TELEGRAM_BOT_TOKEN"):
		print("TELEGRAM_BOT_TOKEN is not set.", file=sys.stderr)
		return 2

	print("Deleting any existing webhook so polling can take over...")
	print(TelegramService.delete_webhook())

	stop = False

	def _on_signal(signum, frame):  # noqa: ARG001
		nonlocal stop
		stop = True
	signal.signal(signal.SIGINT, _on_signal)
	signal.signal(signal.SIGTERM, _on_signal)

	offset = None
	print("Polling for updates. Ctrl-C to stop.")
	try:
		while not stop:
			try:
				resp = TelegramService.get_updates(offset=offset, timeout=25)
			except Exception as e:
				print(f"[poll] getUpdates error: {e}")
				time.sleep(2)
				continue
			if not resp.get("ok"):
				print(f"[poll] non-ok: {resp}")
				time.sleep(2)
				continue
			for update in resp.get("result", []):
				offset = update["update_id"] + 1
				db = SessionLocal()
				try:
					reply = _handle_update(update, db)
				except Exception as e:
					print(f"[poll] handler error: {e}")
					db.rollback()
					reply = None
				finally:
					db.close()
				if reply:
					message = update.get("message") or update.get("edited_message") or {}
					chat_id = (message.get("chat") or {}).get("id")
					if chat_id is not None:
						TelegramService.send_message(chat_id, reply)
	finally:
		_restore_webhook()

	return 0


if __name__ == "__main__":
	raise SystemExit(main())
