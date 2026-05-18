"""
Telegram Bot Routes

HTTP endpoints:
  POST   /v1/telegram/webhook      — Telegram → us (validated by secret header)
  POST   /v1/telegram/link-code    — authenticated: one-time link code
  GET    /v1/telegram/status       — authenticated: linked / not
  DELETE /v1/telegram/link         — authenticated: unlink

The Telegram bot has two interaction modes:
  1. Interactive command UI (no AI): slash commands + inline-keyboard wizards.
     Works even when Groq is down.
  2. Free-text → AI: any message that isn't a known command or a wizard step is
     routed to FinanceChatService.chat().
"""

from __future__ import annotations

import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.transaction import TransactionType
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.schemas.budget import BudgetCreate, BudgetUpdate
from app.schemas.goal import GoalCreate
from app.services import telegram_service
from app.services.budget_service import BudgetService
from app.services.chat_service import FinanceChatService
from app.services.goal_service import GoalService
from app.services.telegram_service import TelegramService
from app.services.transaction_service import TransactionService


router = APIRouter(prefix="/v1/telegram", tags=["telegram"])


# ============================================================
# Constants
# ============================================================

DEFAULT_CATEGORIES = [
	"Food & Dining", "Transportation", "Shopping", "Bills & Utilities",
	"Entertainment", "Healthcare", "Education", "Electronics", "Other",
]

GOAL_ICON_CHOICES = ["🎯", "💰", "✈️", "🏠", "📚", "💻", "🚗", "💡"]


BOT_COMMANDS: List[Dict[str, str]] = [
	{"command": "menu",         "description": "Main menu"},
	{"command": "balance",      "description": "Show balance and monthly summary"},
	{"command": "add",          "description": "Add a transaction"},
	{"command": "transactions", "description": "Recent transactions"},
	{"command": "budgets",      "description": "Budget status"},
	{"command": "goals",        "description": "Goals progress"},
	{"command": "spending",     "description": "Spending by category"},
	{"command": "ai",           "description": "Ask the AI assistant"},
	{"command": "cancel",       "description": "Cancel current action"},
	{"command": "unlink",       "description": "Disconnect this Telegram chat"},
	{"command": "help",         "description": "Help"},
]


HELP_TEXT = (
	"👋 *TrackFinance*\n\n"
	"Use the menu commands (top-left ☰ icon) or tap /menu for buttons.\n\n"
	"You can also type naturally for the AI assistant:\n"
	"_I spent 50 MAD on lunch_ · _How much did I spend on food?_\n\n"
	"Need to cancel a step? /cancel"
)

LINK_REQUIRED_TEXT = (
	"🔒 This chat isn't linked yet.\n"
	"Open *expensehub.site → Settings → Telegram* and tap *Connect Telegram* — "
	"the button opens this chat with a one-tap link code."
)


# ============================================================
# Pydantic response schemas (linking endpoints)
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
# Misc helpers
# ============================================================

def _mask_chat_id(chat_id: Optional[str]) -> Optional[str]:
	if not chat_id:
		return None
	if len(chat_id) <= 4:
		return "*" * len(chat_id)
	return "*" * (len(chat_id) - 4) + chat_id[-4:]


def _bot_username() -> str:
	return os.getenv("TELEGRAM_BOT_USERNAME", "").lstrip("@")


def _fmt_money(n: float) -> str:
	return f"{n:,.2f} MAD"


# ============================================================
# Keyboard builders (inline keyboards)
# ============================================================

def _btn(text: str, data: str) -> Dict[str, str]:
	return {"text": text, "callback_data": data}


def _kb(*rows: List[Dict[str, str]]) -> Dict[str, Any]:
	"""inline_keyboard from positional rows (each row is a list of buttons)."""
	return {"inline_keyboard": [list(r) for r in rows]}


def _main_menu_kb() -> Dict[str, Any]:
	return _kb(
		[_btn("💰 Balance", "nav:balance"), _btn("➕ Add tx", "addtx:start")],
		[_btn("📋 Transactions", "tx:list"), _btn("📊 Budgets", "bgt:list")],
		[_btn("🎯 Goals", "gl:list"), _btn("📈 Spending", "nav:spending")],
		[_btn("🤖 Ask AI", "nav:ai_hint")],
	)


def _category_kb(prefix: str) -> Dict[str, Any]:
	"""Render the 9 default categories as buttons. prefix is e.g. 'addtx:cat' or 'addbgt:cat'."""
	rows = []
	for i in range(0, len(DEFAULT_CATEGORIES), 2):
		row = [_btn(c, f"{prefix}:{c}") for c in DEFAULT_CATEGORIES[i:i + 2]]
		rows.append(row)
	rows.append([_btn("✖ Cancel", "nav:cancel")])
	return _kb(*rows)


def _goal_icon_kb() -> Dict[str, Any]:
	icons = GOAL_ICON_CHOICES
	rows = [
		[_btn(icons[0], f"addgl:icon:{icons[0]}"), _btn(icons[1], f"addgl:icon:{icons[1]}"),
		 _btn(icons[2], f"addgl:icon:{icons[2]}"), _btn(icons[3], f"addgl:icon:{icons[3]}")],
		[_btn(icons[4], f"addgl:icon:{icons[4]}"), _btn(icons[5], f"addgl:icon:{icons[5]}"),
		 _btn(icons[6], f"addgl:icon:{icons[6]}"), _btn(icons[7], f"addgl:icon:{icons[7]}")],
		[_btn("Skip", "addgl:icon:skip"), _btn("✖ Cancel", "nav:cancel")],
	]
	return _kb(*rows)


def _cancel_only_kb() -> Dict[str, Any]:
	return _kb([_btn("✖ Cancel", "nav:cancel")])


# ============================================================
# Formatters
# ============================================================

def _format_balance(ctx: Dict[str, Any]) -> str:
	return (
		f"💰 *Balance:* {_fmt_money(float(ctx.get('balance', 0)))}\n"
		f"📥 Income this month: {_fmt_money(float(ctx.get('monthly_income', 0)))}\n"
		f"📤 Spent this month: {_fmt_money(float(ctx.get('monthly_spending', 0)))}\n"
		f"🎮 Level {ctx.get('level', 0)} · 🔥 Streak {ctx.get('current_streak', 0)} days · "
		f"⭐ {ctx.get('total_xp', 0)} XP"
	)


def _format_transactions(transactions: List[Any]) -> str:
	if not transactions:
		return "📋 *Recent transactions*\n\n_No transactions yet. Use /add to create one._"
	lines = ["📋 *Last 10 transactions:*\n"]
	for t in transactions:
		emoji = "📤" if t.type == "expense" else "📥"
		desc = f" · {t.description}" if t.description else ""
		date = t.date.strftime("%b %d") if t.date else ""
		lines.append(f"`#{t.id}` {emoji} {_fmt_money(float(t.amount))} · {t.category}{desc}  _{date}_")
	return "\n".join(lines)


def _format_budgets(status_data: Dict[str, Any]) -> str:
	budgets = status_data.get("budgets") or []
	if not budgets:
		return "📊 *Budgets*\n\n_No budgets yet. Use /budgets to add one._"
	lines = [f"📊 *Budgets* (this month)\n"]
	for b in budgets:
		bar = _progress_bar(b.get("percentage_used", 0) / 100.0)
		warn = " ⚠️" if b.get("is_over_budget") else ""
		lines.append(
			f"`#{b.get('id')}` *{b.get('category')}*{warn}\n"
			f"  {bar} {b.get('percentage_used', 0):.0f}%\n"
			f"  Spent {_fmt_money(b.get('spent', 0))} / {_fmt_money(b.get('limit', 0))}"
		)
	return "\n\n".join(lines)


def _format_goals(goals: List[Any]) -> str:
	if not goals:
		return "🎯 *Goals*\n\n_No goals yet. Use /goals to add one._"
	lines = ["🎯 *Goals*\n"]
	for g in goals:
		target = float(g.target_amount or 0)
		current = float(g.current_amount or 0)
		pct = (current / target * 100) if target else 0.0
		bar = _progress_bar(pct / 100.0)
		deadline = f" · 📅 {g.deadline.strftime('%b %d, %Y')}" if g.deadline else ""
		lines.append(
			f"`#{g.id}` {g.icon or '🎯'} *{g.name}*{deadline}\n"
			f"  {bar} {pct:.0f}%\n"
			f"  {_fmt_money(current)} / {_fmt_money(target)}"
		)
	return "\n\n".join(lines)


def _format_spending(rows: List[Dict[str, Any]]) -> str:
	if not rows:
		return "📈 *Spending by category* (this month)\n\n_Nothing spent yet this month._"
	total = sum(r["total"] for r in rows) or 1.0
	lines = ["📈 *Spending by category* (this month)\n"]
	for r in sorted(rows, key=lambda x: x["total"], reverse=True):
		pct = r["total"] / total
		lines.append(f"`{r['category']:<18}` {_progress_bar(pct)} {_fmt_money(r['total'])}")
	return "\n".join(lines)


def _progress_bar(fraction: float, width: int = 10) -> str:
	fraction = max(0.0, min(1.0, fraction))
	filled = round(fraction * width)
	return "▰" * filled + "▱" * (width - filled)


def _format_tx_confirm(data: Dict[str, Any]) -> str:
	desc = data.get("description") or "_(none)_"
	return (
		f"Confirm new transaction:\n\n"
		f"*Type:* {data.get('type')}\n"
		f"*Amount:* {_fmt_money(float(data.get('amount', 0)))}\n"
		f"*Category:* {data.get('category')}\n"
		f"*Description:* {desc}\n"
		f"*Date:* {data.get('date', 'today')}"
	)


def _format_budget_confirm(data: Dict[str, Any]) -> str:
	return (
		f"Confirm new budget:\n\n"
		f"*Category:* {data.get('category')}\n"
		f"*Monthly limit:* {_fmt_money(float(data.get('monthly_limit', 0)))}"
	)


def _format_goal_confirm(data: Dict[str, Any]) -> str:
	deadline = data.get("deadline") or "_(none)_"
	return (
		f"Confirm new goal:\n\n"
		f"*Name:* {data.get('name')}\n"
		f"*Icon:* {data.get('icon', '🎯')}\n"
		f"*Target:* {_fmt_money(float(data.get('target_amount', 0)))}\n"
		f"*Deadline:* {deadline}"
	)


# ============================================================
# Linking handlers (existing logic, returns text only)
# ============================================================

def _handle_start_with_code(code: str, chat_id: str, db: Session) -> str:
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

	existing = db.query(User).filter(User.telegram_chat_id == str(chat_id), User.id != user.id).first()
	if existing:
		existing.telegram_chat_id = None

	user.telegram_chat_id = str(chat_id)
	user.telegram_link_code = None
	user.telegram_link_code_expires = None
	db.commit()
	telegram_service.clear_history(user.id)
	telegram_service.clear_wizard(chat_id)

	display = user.username or user.email or "your account"
	return (
		f"✅ Linked to *{display}*!\n\n"
		"Tap /menu for buttons, or type a question for the AI."
	)


def _handle_unlink(chat_id: str, db: Session) -> str:
	user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
	if not user:
		return "This chat isn't linked to any account."
	user.telegram_chat_id = None
	db.commit()
	telegram_service.clear_history(user.id)
	telegram_service.clear_wizard(chat_id)
	return "🔌 Unlinked. You can re-link any time from Settings → Telegram."


# ============================================================
# AI passthrough
# ============================================================

def _process_chat_message(user: User, text: str, db: Session) -> str:
	history = telegram_service.get_history(user.id)
	try:
		chat_service = FinanceChatService()
	except ValueError:
		return "⚠️ The AI service is not configured on the server. Use /menu for the button interface."
	result = chat_service.chat(
		user_message=text,
		user_id=user.id,
		db=db,
		conversation_history=history,
	)
	telegram_service.update_history(user.id, result.get("conversation_history") or [])
	return result.get("response") or "Sorry, I don't have a response for that."


# ============================================================
# Command handlers (no AI)
#   Each takes (chat_id, user, db) and sends its own Telegram replies.
# ============================================================

def _cmd_menu(chat_id: str, user: User, db: Session) -> None:
	TelegramService.send_message(
		chat_id,
		f"Hi *{user.username or 'there'}* 👋\nWhat would you like to do?",
		reply_markup=_main_menu_kb(),
	)


def _cmd_balance(chat_id: str, user: User, db: Session) -> None:
	# Reuse the same context method the AI uses.
	chat_service = FinanceChatService.__new__(FinanceChatService)  # no Groq init needed
	ctx = chat_service._get_user_context(user.id, db)  # type: ignore[attr-defined]
	TelegramService.send_message(chat_id, _format_balance(ctx), reply_markup=_main_menu_kb())


def _cmd_transactions(chat_id: str, user: User, db: Session) -> None:
	txs = TransactionService.get_user_transactions(db, user.id, skip=0, limit=10)
	text = _format_transactions(txs)
	if txs:
		# Per-row delete buttons (edit-in-bot is multi-step and not in v1)
		rows = []
		for t in txs[:10]:
			rows.append([_btn(f"🗑 Delete #{t.id} ({t.category})", f"tx:del:{t.id}")])
		rows.append([_btn("➕ Add transaction", "addtx:start"), _btn("↩ Menu", "nav:menu")])
		kb = _kb(*rows)
	else:
		kb = _kb([_btn("➕ Add transaction", "addtx:start"), _btn("↩ Menu", "nav:menu")])
	TelegramService.send_message(chat_id, text, reply_markup=kb)


def _cmd_budgets(chat_id: str, user: User, db: Session) -> None:
	status_data = BudgetService.get_budget_status(db, user.id)
	text = _format_budgets(status_data)
	budgets = status_data.get("budgets") or []
	rows = []
	for b in budgets:
		bid = b.get("id")
		rows.append([
			_btn(f"✏️ Edit limit · {b.get('category')}", f"bgt:edit:{bid}"),
			_btn("🗑 Delete", f"bgt:del:{bid}"),
		])
	rows.append([_btn("➕ Add budget", "addbgt:start"), _btn("↩ Menu", "nav:menu")])
	TelegramService.send_message(chat_id, text, reply_markup=_kb(*rows))


def _cmd_goals(chat_id: str, user: User, db: Session) -> None:
	goals = GoalService.get_user_goals(db, user.id)
	text = _format_goals(goals)
	rows = []
	for g in goals:
		rows.append([
			_btn(f"💸 Contribute · {g.name[:20]}", f"contrib:start:{g.id}"),
			_btn("🗑", f"gl:del:{g.id}"),
		])
	rows.append([_btn("➕ Add goal", "addgl:start"), _btn("↩ Menu", "nav:menu")])
	TelegramService.send_message(chat_id, text, reply_markup=_kb(*rows))


def _cmd_spending(chat_id: str, user: User, db: Session) -> None:
	# Reuse chat_service helper that already does the grouping query.
	chat_service = FinanceChatService.__new__(FinanceChatService)
	rows_data = chat_service._get_spending_by_category(user.id, db).get("spending_by_category", [])  # type: ignore[attr-defined]
	TelegramService.send_message(chat_id, _format_spending(rows_data), reply_markup=_main_menu_kb())


def _cmd_help(chat_id: str) -> None:
	TelegramService.send_message(chat_id, HELP_TEXT, reply_markup=_main_menu_kb())


def _cmd_cancel(chat_id: str) -> None:
	had = telegram_service.get_wizard(chat_id) is not None
	telegram_service.clear_wizard(chat_id)
	TelegramService.send_message(
		chat_id,
		"Cancelled. Use /menu when you're ready." if had else "Nothing to cancel.",
	)


# ============================================================
# Wizards: helpers
# ============================================================

def _parse_amount(text: str) -> Optional[float]:
	"""Lenient amount parser. Accepts '50', '50.5', '50,5', '50 mad', etc."""
	cleaned = re.sub(r"[^0-9.,]", "", text)
	if not cleaned:
		return None
	cleaned = cleaned.replace(",", ".")
	# Keep only the first dot
	parts = cleaned.split(".")
	if len(parts) > 2:
		cleaned = parts[0] + "." + "".join(parts[1:])
	try:
		v = float(cleaned)
		return v if v > 0 else None
	except ValueError:
		return None


def _parse_date(text: str) -> Optional[str]:
	"""Accepts YYYY-MM-DD. Returns the string back on success, None otherwise."""
	text = text.strip()
	if not re.match(r"^\d{4}-\d{2}-\d{2}$", text):
		return None
	try:
		datetime.strptime(text, "%Y-%m-%d")
		return text
	except ValueError:
		return None


# ============================================================
# Wizard: add transaction
# ============================================================

def _start_add_tx(chat_id: str) -> None:
	telegram_service.set_wizard(chat_id, "addtx", "type", {})
	TelegramService.send_message(
		chat_id,
		"➕ *New transaction*\n\nWhat type?",
		reply_markup=_kb(
			[_btn("📤 Expense", "addtx:type:expense"), _btn("📥 Income", "addtx:type:income")],
			[_btn("✖ Cancel", "nav:cancel")],
		),
	)


def _addtx_callback(parts: List[str], chat_id: str, message_id: int, user: User, db: Session) -> None:
	state = telegram_service.get_wizard(chat_id)
	if not state or state.get("flow") != "addtx":
		return
	# parts[0]=="addtx", parts[1]=step, parts[2:]=value(s)
	step = parts[1] if len(parts) > 1 else ""
	if step == "type" and len(parts) >= 3:
		telegram_service.update_wizard_data(chat_id, type=parts[2])
		telegram_service.set_wizard_step(chat_id, "amount")
		TelegramService.edit_message_text(
			chat_id, message_id,
			f"Type: *{parts[2]}*\n\n💵 *Amount?* Send a positive number (e.g. `50`).",
			reply_markup=_cancel_only_kb(),
		)
	elif step == "cat" and len(parts) >= 3:
		category = ":".join(parts[2:])  # category may contain colons? defensive
		telegram_service.update_wizard_data(chat_id, category=category)
		telegram_service.set_wizard_step(chat_id, "description")
		TelegramService.edit_message_text(
			chat_id, message_id,
			f"Category: *{category}*\n\n📝 *Description?* Type a note, or tap Skip.",
			reply_markup=_kb([_btn("Skip", "addtx:skip_desc"), _btn("✖ Cancel", "nav:cancel")]),
		)
	elif step == "skip_desc":
		telegram_service.update_wizard_data(chat_id, description=None)
		_addtx_to_confirm(chat_id, message_id, state["data"])
	elif step == "other":
		telegram_service.set_wizard_step(chat_id, "category_text")
		TelegramService.edit_message_text(
			chat_id, message_id,
			"Type the category name (e.g. `Coffee`).",
			reply_markup=_cancel_only_kb(),
		)
	elif step == "save":
		_addtx_save(chat_id, user, db)


def _addtx_to_confirm(chat_id: str, message_id: Optional[int], data: Dict[str, Any]) -> None:
	if "date" not in data:
		data["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
		telegram_service.update_wizard_data(chat_id, date=data["date"])
	telegram_service.set_wizard_step(chat_id, "confirm")
	text = _format_tx_confirm(data)
	kb = _kb([_btn("✅ Save", "addtx:save"), _btn("✖ Cancel", "nav:cancel")])
	if message_id is not None:
		TelegramService.edit_message_text(chat_id, message_id, text, reply_markup=kb)
	else:
		TelegramService.send_message(chat_id, text, reply_markup=kb)


def _addtx_text(state: Dict[str, Any], text: str, chat_id: str, user: User, db: Session) -> None:
	step = state.get("step")
	if step == "amount":
		amount = _parse_amount(text)
		if amount is None:
			TelegramService.send_message(chat_id, "Please send a positive number, e.g. `50`. Or /cancel.")
			return
		telegram_service.update_wizard_data(chat_id, amount=amount)
		telegram_service.set_wizard_step(chat_id, "category")
		TelegramService.send_message(
			chat_id,
			f"Amount: *{_fmt_money(amount)}*\n\n📂 *Category?*",
			reply_markup=_category_kb("addtx:cat"),
		)
	elif step == "category_text":
		cat = text.strip()[:50]
		if not cat:
			TelegramService.send_message(chat_id, "Type a category name, or /cancel.")
			return
		telegram_service.update_wizard_data(chat_id, category=cat)
		telegram_service.set_wizard_step(chat_id, "description")
		TelegramService.send_message(
			chat_id,
			f"Category: *{cat}*\n\n📝 *Description?* Type a note, or tap Skip.",
			reply_markup=_kb([_btn("Skip", "addtx:skip_desc"), _btn("✖ Cancel", "nav:cancel")]),
		)
	elif step == "description":
		telegram_service.update_wizard_data(chat_id, description=text.strip()[:255])
		_addtx_to_confirm(chat_id, None, telegram_service.get_wizard(chat_id)["data"])
	else:
		# Unrecognized text for this step
		TelegramService.send_message(chat_id, "Use the buttons above, or /cancel.")


def _addtx_save(chat_id: str, user: User, db: Session) -> None:
	state = telegram_service.get_wizard(chat_id)
	if not state or state.get("flow") != "addtx":
		return
	d = state["data"]
	try:
		t_date = datetime.strptime(d["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
		t = TransactionService.create_transaction(
			db, user.id,
			TransactionCreate(
				amount=float(d["amount"]),
				type=TransactionType(d["type"]),
				category=d["category"],
				description=d.get("description"),
				date=t_date,
			),
		)
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(
			chat_id,
			f"✅ Saved transaction `#{t.id}` · {_fmt_money(float(t.amount))} · {t.category}",
			reply_markup=_main_menu_kb(),
		)
	except Exception as e:
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(chat_id, f"❌ Couldn't save: {e}")


# ============================================================
# Wizard: add budget
# ============================================================

def _start_add_budget(chat_id: str) -> None:
	telegram_service.set_wizard(chat_id, "addbgt", "category", {})
	TelegramService.send_message(
		chat_id,
		"📊 *New budget*\n\n📂 *Category?*",
		reply_markup=_category_kb("addbgt:cat"),
	)


def _addbgt_callback(parts: List[str], chat_id: str, message_id: int, user: User, db: Session) -> None:
	state = telegram_service.get_wizard(chat_id)
	if not state or state.get("flow") != "addbgt":
		return
	step = parts[1] if len(parts) > 1 else ""
	if step == "cat" and len(parts) >= 3:
		cat = ":".join(parts[2:])
		telegram_service.update_wizard_data(chat_id, category=cat)
		telegram_service.set_wizard_step(chat_id, "limit")
		TelegramService.edit_message_text(
			chat_id, message_id,
			f"Category: *{cat}*\n\n💵 *Monthly limit?* Send a positive number (e.g. `1500`).",
			reply_markup=_cancel_only_kb(),
		)
	elif step == "save":
		_addbgt_save(chat_id, user, db)


def _addbgt_text(state: Dict[str, Any], text: str, chat_id: str, user: User, db: Session) -> None:
	step = state.get("step")
	if step == "limit":
		amount = _parse_amount(text)
		if amount is None:
			TelegramService.send_message(chat_id, "Please send a positive number, e.g. `1500`. Or /cancel.")
			return
		telegram_service.update_wizard_data(chat_id, monthly_limit=amount)
		telegram_service.set_wizard_step(chat_id, "confirm")
		TelegramService.send_message(
			chat_id,
			_format_budget_confirm(telegram_service.get_wizard(chat_id)["data"]),
			reply_markup=_kb([_btn("✅ Save", "addbgt:save"), _btn("✖ Cancel", "nav:cancel")]),
		)
	else:
		TelegramService.send_message(chat_id, "Use the buttons above, or /cancel.")


def _addbgt_save(chat_id: str, user: User, db: Session) -> None:
	state = telegram_service.get_wizard(chat_id)
	if not state or state.get("flow") != "addbgt":
		return
	d = state["data"]
	try:
		b = BudgetService.create_budget(
			db, user.id,
			BudgetCreate(category=d["category"], monthly_limit=float(d["monthly_limit"])),
		)
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(
			chat_id,
			f"✅ Budget `#{b.id}` created · {b.category} · {_fmt_money(float(b.monthly_limit))}/mo",
			reply_markup=_main_menu_kb(),
		)
	except Exception as e:
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(chat_id, f"❌ Couldn't create budget: {e}")


# ============================================================
# Wizard: add goal
# ============================================================

def _start_add_goal(chat_id: str) -> None:
	telegram_service.set_wizard(chat_id, "addgl", "name", {})
	TelegramService.send_message(
		chat_id,
		"🎯 *New goal*\n\n*Name?* (e.g. `Emergency Fund`, `Vacation`)",
		reply_markup=_cancel_only_kb(),
	)


def _addgl_callback(parts: List[str], chat_id: str, message_id: int, user: User, db: Session) -> None:
	state = telegram_service.get_wizard(chat_id)
	if not state or state.get("flow") != "addgl":
		return
	step = parts[1] if len(parts) > 1 else ""
	if step == "icon" and len(parts) >= 3:
		icon = parts[2]
		if icon == "skip":
			icon = "🎯"
		telegram_service.update_wizard_data(chat_id, icon=icon)
		telegram_service.set_wizard_step(chat_id, "target")
		TelegramService.edit_message_text(
			chat_id, message_id,
			f"Icon: {icon}\n\n💵 *Target amount?* (positive number)",
			reply_markup=_cancel_only_kb(),
		)
	elif step == "skip_deadline":
		telegram_service.update_wizard_data(chat_id, deadline=None)
		telegram_service.set_wizard_step(chat_id, "confirm")
		TelegramService.edit_message_text(
			chat_id, message_id,
			_format_goal_confirm(state["data"] | {"deadline": None}),
			reply_markup=_kb([_btn("✅ Save", "addgl:save"), _btn("✖ Cancel", "nav:cancel")]),
		)
	elif step == "save":
		_addgl_save(chat_id, user, db)


def _addgl_text(state: Dict[str, Any], text: str, chat_id: str, user: User, db: Session) -> None:
	step = state.get("step")
	if step == "name":
		name = text.strip()[:100]
		if not name:
			TelegramService.send_message(chat_id, "Type a goal name, or /cancel.")
			return
		telegram_service.update_wizard_data(chat_id, name=name)
		telegram_service.set_wizard_step(chat_id, "icon")
		TelegramService.send_message(
			chat_id,
			f"Name: *{name}*\n\nPick an icon:",
			reply_markup=_goal_icon_kb(),
		)
	elif step == "target":
		amount = _parse_amount(text)
		if amount is None:
			TelegramService.send_message(chat_id, "Please send a positive number, e.g. `5000`. Or /cancel.")
			return
		telegram_service.update_wizard_data(chat_id, target_amount=amount)
		telegram_service.set_wizard_step(chat_id, "deadline")
		TelegramService.send_message(
			chat_id,
			f"Target: *{_fmt_money(amount)}*\n\n📅 *Deadline?* Send `YYYY-MM-DD`, or tap Skip.",
			reply_markup=_kb([_btn("Skip", "addgl:skip_deadline"), _btn("✖ Cancel", "nav:cancel")]),
		)
	elif step == "deadline":
		date = _parse_date(text)
		if not date:
			TelegramService.send_message(chat_id, "Date format is YYYY-MM-DD (e.g. `2026-12-31`). Or tap Skip / /cancel.")
			return
		telegram_service.update_wizard_data(chat_id, deadline=date)
		telegram_service.set_wizard_step(chat_id, "confirm")
		TelegramService.send_message(
			chat_id,
			_format_goal_confirm(telegram_service.get_wizard(chat_id)["data"]),
			reply_markup=_kb([_btn("✅ Save", "addgl:save"), _btn("✖ Cancel", "nav:cancel")]),
		)
	else:
		TelegramService.send_message(chat_id, "Use the buttons above, or /cancel.")


def _addgl_save(chat_id: str, user: User, db: Session) -> None:
	state = telegram_service.get_wizard(chat_id)
	if not state or state.get("flow") != "addgl":
		return
	d = state["data"]
	try:
		deadline = datetime.strptime(d["deadline"], "%Y-%m-%d").date() if d.get("deadline") else None
		g = GoalService.create_goal(
			db,
			GoalCreate(
				name=d["name"],
				icon=d.get("icon", "🎯"),
				target_amount=float(d["target_amount"]),
				current_amount=0.0,
				deadline=deadline,
			),
			user.id,
		)
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(
			chat_id,
			f"✅ Goal `#{g.id}` created · {g.icon} {g.name} · target {_fmt_money(float(g.target_amount))}",
			reply_markup=_main_menu_kb(),
		)
	except Exception as e:
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(chat_id, f"❌ Couldn't create goal: {e}")


# ============================================================
# Wizard: contribute to goal
# ============================================================

def _start_contribute(chat_id: str, goal_id: int, user: User, db: Session) -> None:
	goals = GoalService.get_user_goals(db, user.id)
	goal = next((g for g in goals if g.id == goal_id), None)
	if not goal:
		TelegramService.send_message(chat_id, "Goal not found.")
		return
	telegram_service.set_wizard(chat_id, "contrib", "amount", {"goal_id": goal_id, "goal_name": goal.name})
	TelegramService.send_message(
		chat_id,
		f"💸 *Contribute to* {goal.icon or '🎯'} *{goal.name}*\n\nHow much? (positive number)",
		reply_markup=_cancel_only_kb(),
	)


def _contrib_text(state: Dict[str, Any], text: str, chat_id: str, user: User, db: Session) -> None:
	if state.get("step") != "amount":
		TelegramService.send_message(chat_id, "Use the buttons above, or /cancel.")
		return
	amount = _parse_amount(text)
	if amount is None:
		TelegramService.send_message(chat_id, "Please send a positive number, e.g. `200`. Or /cancel.")
		return
	d = state["data"]
	try:
		updated = GoalService.add_to_goal(db, int(d["goal_id"]), user.id, amount)
		telegram_service.clear_wizard(chat_id)
		if not updated:
			TelegramService.send_message(chat_id, "❌ Goal not found.")
			return
		pct = float(updated.current_amount or 0) / float(updated.target_amount) * 100 if updated.target_amount else 0
		TelegramService.send_message(
			chat_id,
			f"✅ Added {_fmt_money(amount)} to *{updated.name}*\n"
			f"{_progress_bar(pct / 100)} {pct:.0f}% — "
			f"{_fmt_money(float(updated.current_amount or 0))} / {_fmt_money(float(updated.target_amount))}",
			reply_markup=_main_menu_kb(),
		)
	except Exception as e:
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(chat_id, f"❌ Couldn't add: {e}")


# ============================================================
# Wizard: edit budget limit
# ============================================================

def _start_edit_budget(chat_id: str, budget_id: int, user: User, db: Session) -> None:
	status_data = BudgetService.get_budget_status(db, user.id)
	budget = next((b for b in (status_data.get("budgets") or []) if b.get("id") == budget_id), None)
	if not budget:
		TelegramService.send_message(chat_id, "Budget not found.")
		return
	telegram_service.set_wizard(chat_id, "editbgt", "limit", {"budget_id": budget_id, "category": budget["category"]})
	TelegramService.send_message(
		chat_id,
		f"✏️ *Edit budget* `#{budget_id}` · {budget['category']}\n\n"
		f"Current limit: {_fmt_money(float(budget['limit']))}\n\n"
		"Send the new monthly limit (positive number).",
		reply_markup=_cancel_only_kb(),
	)


def _editbgt_text(state: Dict[str, Any], text: str, chat_id: str, user: User, db: Session) -> None:
	if state.get("step") != "limit":
		return
	amount = _parse_amount(text)
	if amount is None:
		TelegramService.send_message(chat_id, "Please send a positive number. Or /cancel.")
		return
	d = state["data"]
	try:
		updated = BudgetService.update_budget(
			db, int(d["budget_id"]), user.id, BudgetUpdate(monthly_limit=amount),
		)
		telegram_service.clear_wizard(chat_id)
		if not updated:
			TelegramService.send_message(chat_id, "❌ Budget not found.")
			return
		TelegramService.send_message(
			chat_id,
			f"✅ Budget *{updated.category}* updated · new limit {_fmt_money(float(updated.monthly_limit))}",
			reply_markup=_main_menu_kb(),
		)
	except Exception as e:
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(chat_id, f"❌ Couldn't update: {e}")


# ============================================================
# Delete confirmations (transaction / budget / goal)
# ============================================================

def _confirm_delete(chat_id: str, message_id: int, kind: str, entity_id: int, label: str) -> None:
	TelegramService.edit_message_text(
		chat_id, message_id,
		f"🗑 Delete *{label}*?",
		reply_markup=_kb(
			[_btn("✅ Yes, delete", f"{kind}:del:{entity_id}:yes"), _btn("✖ No", "nav:menu")],
		),
	)


def _do_delete(kind: str, entity_id: int, chat_id: str, message_id: int, user: User, db: Session) -> None:
	try:
		if kind == "tx":
			ok = TransactionService.delete_transaction(db, user.id, entity_id)
		elif kind == "bgt":
			ok = BudgetService.delete_budget(db, entity_id, user.id)
		elif kind == "gl":
			ok = GoalService.delete_goal(db, entity_id, user.id)
		else:
			ok = False
		if ok:
			TelegramService.edit_message_text(chat_id, message_id, f"🗑 Deleted.", reply_markup=_main_menu_kb())
		else:
			TelegramService.edit_message_text(chat_id, message_id, "❌ Not found.", reply_markup=_main_menu_kb())
	except Exception as e:
		TelegramService.edit_message_text(chat_id, message_id, f"❌ Couldn't delete: {e}", reply_markup=_main_menu_kb())


# ============================================================
# Top-level dispatcher
# ============================================================

COMMAND_HANDLERS = {
	"/menu":         lambda chat_id, user, db: _cmd_menu(chat_id, user, db),
	"/balance":      lambda chat_id, user, db: _cmd_balance(chat_id, user, db),
	"/add":          lambda chat_id, user, db: _start_add_tx(chat_id),
	"/transactions": lambda chat_id, user, db: _cmd_transactions(chat_id, user, db),
	"/budgets":      lambda chat_id, user, db: _cmd_budgets(chat_id, user, db),
	"/goals":        lambda chat_id, user, db: _cmd_goals(chat_id, user, db),
	"/spending":     lambda chat_id, user, db: _cmd_spending(chat_id, user, db),
}


def _handle_message(message: Dict[str, Any], db: Session) -> None:
	chat = message.get("chat") or {}
	chat_id_raw = chat.get("id")
	if chat_id_raw is None:
		return
	chat_id = str(chat_id_raw)
	text = (message.get("text") or "").strip()
	if not text:
		TelegramService.send_message(chat_id, "I can only read text messages right now.")
		return

	# ── Pre-link / link commands ───────────────────────────────
	if text.startswith("/start ") or text.startswith("/link "):
		code = text.split(maxsplit=1)[1].strip()
		TelegramService.send_message(chat_id, _handle_start_with_code(code, chat_id, db))
		return

	if text in ("/start", "/help"):
		# /start with no code: show help; works whether linked or not.
		_cmd_help(chat_id)
		return

	if text == "/unlink":
		TelegramService.send_message(chat_id, _handle_unlink(chat_id, db))
		return

	if text == "/cancel":
		_cmd_cancel(chat_id)
		return

	# Require linked account for everything below.
	user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
	if not user:
		TelegramService.send_message(chat_id, LINK_REQUIRED_TEXT)
		return

	# ── Explicit AI route ──────────────────────────────────────
	if text == "/ai" or text.startswith("/ai "):
		question = text[3:].strip() if text.startswith("/ai ") else ""
		if not question:
			TelegramService.send_message(chat_id, "Send `/ai <your question>` or just type your question without /ai.")
			return
		telegram_service.clear_wizard(chat_id)
		TelegramService.send_message(chat_id, _process_chat_message(user, question, db))
		return

	# ── Slash commands (registered with BotFather) ─────────────
	cmd = text.split()[0].lower()
	handler = COMMAND_HANDLERS.get(cmd)
	if handler:
		# Starting a new command interrupts any active wizard.
		telegram_service.clear_wizard(chat_id)
		handler(chat_id, user, db)
		return

	# ── Active wizard? Route to step handler. ──────────────────
	state = telegram_service.get_wizard(chat_id)
	if state:
		flow = state.get("flow")
		if flow == "addtx":
			_addtx_text(state, text, chat_id, user, db)
			return
		if flow == "addbgt":
			_addbgt_text(state, text, chat_id, user, db)
			return
		if flow == "addgl":
			_addgl_text(state, text, chat_id, user, db)
			return
		if flow == "contrib":
			_contrib_text(state, text, chat_id, user, db)
			return
		if flow == "editbgt":
			_editbgt_text(state, text, chat_id, user, db)
			return
		# Unknown wizard flow — clear it and fall through to AI.
		telegram_service.clear_wizard(chat_id)

	# ── Default: free text → AI ────────────────────────────────
	TelegramService.send_message(chat_id, _process_chat_message(user, text, db))


def _handle_callback(query: Dict[str, Any], db: Session) -> None:
	query_id = query.get("id")
	data = (query.get("data") or "").strip()
	message = query.get("message") or {}
	chat_id_raw = (message.get("chat") or {}).get("id")
	message_id = message.get("message_id")
	if not data or chat_id_raw is None or message_id is None:
		if query_id:
			TelegramService.answer_callback_query(query_id)
		return
	chat_id = str(chat_id_raw)

	# Acknowledge first (clears the spinner). Best-effort; ignore errors.
	if query_id:
		try:
			TelegramService.answer_callback_query(query_id)
		except Exception:
			pass

	# Linked-user check (almost all callbacks require it).
	user = db.query(User).filter(User.telegram_chat_id == chat_id).first()

	parts = data.split(":")
	prefix = parts[0]

	# ── Navigation ─────────────────────────────────────────────
	if prefix == "nav":
		sub = parts[1] if len(parts) > 1 else ""
		if sub == "menu":
			if not user:
				TelegramService.edit_message_text(chat_id, message_id, LINK_REQUIRED_TEXT)
				return
			TelegramService.edit_message_text(chat_id, message_id, "What would you like to do?", reply_markup=_main_menu_kb())
			return
		if sub == "balance" and user:
			chat_service = FinanceChatService.__new__(FinanceChatService)
			ctx = chat_service._get_user_context(user.id, db)  # type: ignore[attr-defined]
			TelegramService.edit_message_text(chat_id, message_id, _format_balance(ctx), reply_markup=_main_menu_kb())
			return
		if sub == "spending" and user:
			chat_service = FinanceChatService.__new__(FinanceChatService)
			rows_data = chat_service._get_spending_by_category(user.id, db).get("spending_by_category", [])  # type: ignore[attr-defined]
			TelegramService.edit_message_text(chat_id, message_id, _format_spending(rows_data), reply_markup=_main_menu_kb())
			return
		if sub == "ai_hint":
			TelegramService.edit_message_text(
				chat_id, message_id,
				"🤖 Type your question (no /ai needed). Examples:\n"
				"_How much did I spend on food this month?_\n"
				"_What's my biggest expense?_",
				reply_markup=_main_menu_kb(),
			)
			return
		if sub == "cancel":
			telegram_service.clear_wizard(chat_id)
			TelegramService.edit_message_text(chat_id, message_id, "Cancelled.", reply_markup=_main_menu_kb())
			return
		return

	if not user:
		TelegramService.edit_message_text(chat_id, message_id, LINK_REQUIRED_TEXT)
		return

	# ── Wizard starts ──────────────────────────────────────────
	if data == "addtx:start":
		_start_add_tx(chat_id)
		return
	if data == "addbgt:start":
		_start_add_budget(chat_id)
		return
	if data == "addgl:start":
		_start_add_goal(chat_id)
		return
	if prefix == "contrib" and len(parts) >= 3 and parts[1] == "start":
		_start_contribute(chat_id, int(parts[2]), user, db)
		return

	# ── Wizard steps via callbacks ─────────────────────────────
	if prefix == "addtx":
		_addtx_callback(parts, chat_id, message_id, user, db)
		return
	if prefix == "addbgt":
		_addbgt_callback(parts, chat_id, message_id, user, db)
		return
	if prefix == "addgl":
		_addgl_callback(parts, chat_id, message_id, user, db)
		return

	# ── List re-renders (when "↩ Menu" or similar pulls them back up) ──
	if data == "tx:list":
		_cmd_transactions(chat_id, user, db)
		return
	if data == "bgt:list":
		_cmd_budgets(chat_id, user, db)
		return
	if data == "gl:list":
		_cmd_goals(chat_id, user, db)
		return

	# ── Edit / delete inline buttons ───────────────────────────
	# data formats: "<kind>:del:<id>" → confirm; "<kind>:del:<id>:yes" → execute
	#               "bgt:edit:<id>" → start edit budget wizard
	if prefix == "tx" and len(parts) >= 3 and parts[1] == "del":
		eid = int(parts[2])
		if len(parts) >= 4 and parts[3] == "yes":
			_do_delete("tx", eid, chat_id, message_id, user, db)
		else:
			_confirm_delete(chat_id, message_id, "tx", eid, f"transaction #{eid}")
		return
	if prefix == "bgt":
		sub = parts[1] if len(parts) > 1 else ""
		if sub == "del" and len(parts) >= 3:
			eid = int(parts[2])
			if len(parts) >= 4 and parts[3] == "yes":
				_do_delete("bgt", eid, chat_id, message_id, user, db)
			else:
				_confirm_delete(chat_id, message_id, "bgt", eid, f"budget #{eid}")
			return
		if sub == "edit" and len(parts) >= 3:
			_start_edit_budget(chat_id, int(parts[2]), user, db)
			return
	if prefix == "gl" and len(parts) >= 3 and parts[1] == "del":
		eid = int(parts[2])
		if len(parts) >= 4 and parts[3] == "yes":
			_do_delete("gl", eid, chat_id, message_id, user, db)
		else:
			_confirm_delete(chat_id, message_id, "gl", eid, f"goal #{eid}")
		return

	# Unknown callback — quietly ignore.


def _handle_update(update: Dict[str, Any], db: Session) -> None:
	"""
	Single entry point for both webhook and polling. Returns nothing —
	I/O is done directly via TelegramService.
	"""
	if "callback_query" in update:
		_handle_callback(update["callback_query"], db)
		return
	message = update.get("message") or update.get("edited_message")
	if not message:
		return
	_handle_message(message, db)


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
	Always returns 200 so Telegram doesn't enter an exponential-retry loop on
	internal errors. The secret-token header is the only auth.
	"""
	expected = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
	if not expected:
		raise HTTPException(status_code=503, detail="Telegram webhook secret not configured")
	if not x_telegram_bot_api_secret_token or not hmac.compare_digest(x_telegram_bot_api_secret_token, expected):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid secret token")

	try:
		update = await request.json()
	except Exception:
		return {"ok": True}

	try:
		_handle_update(update, db)
	except Exception as e:
		print(f"[telegram] handler error: {e}")
		try:
			db.rollback()
		except Exception:
			pass

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
	if had_chat:
		telegram_service.clear_wizard(had_chat)
		try:
			TelegramService.send_message(
				had_chat,
				"🔌 Your TrackFinance account was unlinked from this chat via the web app.",
			)
		except Exception:
			pass

	return GenericOk(ok=True, message="Unlinked" if had_chat else "Was not linked")
