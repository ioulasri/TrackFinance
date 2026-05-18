"""
Register the Telegram bot's webhook with Telegram.

Run once per environment (after a fresh deploy or whenever BACKEND_URL,
TELEGRAM_BOT_TOKEN, or TELEGRAM_WEBHOOK_SECRET changes):

    python -m app.scripts.setup_telegram_webhook

Env vars required:
  TELEGRAM_BOT_TOKEN        from @BotFather
  TELEGRAM_WEBHOOK_SECRET   random string (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
  BACKEND_URL               public HTTPS URL of the backend (e.g. https://api.expensehub.site)

The webhook path is hard-coded to /v1/telegram/webhook.

Pass --delete to clear the registered webhook instead.
"""

import os
import sys

from app.services.telegram_service import TelegramService


def main() -> int:
	if "--delete" in sys.argv:
		info = TelegramService.delete_webhook()
		print("deleteWebhook →", info)
		return 0 if info.get("ok") else 1

	token = os.getenv("TELEGRAM_BOT_TOKEN")
	secret = os.getenv("TELEGRAM_WEBHOOK_SECRET")
	backend_url = os.getenv("BACKEND_URL")

	missing = [k for k, v in {
		"TELEGRAM_BOT_TOKEN": token,
		"TELEGRAM_WEBHOOK_SECRET": secret,
		"BACKEND_URL": backend_url,
	}.items() if not v]
	if missing:
		print(f"Missing env vars: {', '.join(missing)}", file=sys.stderr)
		return 2

	if not backend_url.startswith("https://"):
		print(
			f"WARNING: BACKEND_URL is '{backend_url}'. Telegram requires HTTPS for webhooks. "
			"setWebhook will fail unless the URL is publicly reachable over TLS.",
			file=sys.stderr,
		)

	webhook_url = backend_url.rstrip("/") + "/v1/telegram/webhook"
	print(f"Registering webhook: {webhook_url}")
	result = TelegramService.set_webhook(webhook_url, secret)
	print("setWebhook →", result)
	info = TelegramService.get_webhook_info()
	print("getWebhookInfo →", info)
	return 0 if result.get("ok") else 1


if __name__ == "__main__":
	raise SystemExit(main())
