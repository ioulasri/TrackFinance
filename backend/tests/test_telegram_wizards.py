"""
Unit tests for the Telegram bot's wizard state machine and the /add transaction
happy path. Telegram I/O (send_message, edit_message_text, answer_callback_query)
is monkey-patched to a capture list — no network calls.
"""

import time
import pytest

from app.api.routes import telegram as tg_route
from app.services import telegram_service
from app.services.telegram_service import TelegramService
from app.models.transaction import Transaction


@pytest.fixture(autouse=True)
def _reset_wizard_state():
	"""Ensure each test starts with a clean wizard dict."""
	telegram_service._WIZARDS.clear()
	telegram_service._HISTORY.clear()
	yield
	telegram_service._WIZARDS.clear()
	telegram_service._HISTORY.clear()


@pytest.fixture
def captured(monkeypatch):
	"""Capture all outbound Telegram I/O for assertions."""
	sent = []
	edited = []
	acks = []

	def send_message(chat_id, text, parse_mode="Markdown", reply_markup=None):
		sent.append({"chat_id": str(chat_id), "text": text, "reply_markup": reply_markup})
		return {"ok": True}

	def edit_message_text(chat_id, message_id, text, parse_mode="Markdown", reply_markup=None):
		edited.append({"chat_id": str(chat_id), "message_id": message_id, "text": text, "reply_markup": reply_markup})
		return {"ok": True}

	def answer_callback_query(callback_query_id, text=None):
		acks.append({"id": callback_query_id, "text": text})
		return {"ok": True}

	monkeypatch.setattr(TelegramService, "send_message", staticmethod(send_message))
	monkeypatch.setattr(TelegramService, "edit_message_text", staticmethod(edit_message_text))
	monkeypatch.setattr(TelegramService, "answer_callback_query", staticmethod(answer_callback_query))
	return {"sent": sent, "edited": edited, "acks": acks}


@pytest.fixture
def linked_user(db_session, test_user):
	"""Link the test user to a fixed chat_id."""
	test_user.telegram_chat_id = "555000"
	db_session.commit()
	db_session.refresh(test_user)
	return test_user


# ──────────────────────────────────────────────────────────────────
# State machine
# ──────────────────────────────────────────────────────────────────

class TestWizardState:
	def test_set_and_get(self):
		telegram_service.set_wizard("123", "addtx", "amount", {"type": "expense"})
		state = telegram_service.get_wizard("123")
		assert state is not None
		assert state["flow"] == "addtx"
		assert state["step"] == "amount"
		assert state["data"] == {"type": "expense"}

	def test_clear(self):
		telegram_service.set_wizard("123", "addtx", "amount")
		telegram_service.clear_wizard("123")
		assert telegram_service.get_wizard("123") is None

	def test_chat_id_normalized_to_string(self):
		telegram_service.set_wizard(123, "addtx", "amount")
		assert telegram_service.get_wizard(123) is not None
		assert telegram_service.get_wizard("123") is not None

	def test_update_wizard_data_merges(self):
		telegram_service.set_wizard("123", "addtx", "amount", {"type": "expense"})
		telegram_service.update_wizard_data("123", amount=50.0, category="Food")
		state = telegram_service.get_wizard("123")
		assert state["data"] == {"type": "expense", "amount": 50.0, "category": "Food"}

	def test_set_wizard_step_advances(self):
		telegram_service.set_wizard("123", "addtx", "amount")
		telegram_service.set_wizard_step("123", "category")
		assert telegram_service.get_wizard("123")["step"] == "category"

	def test_ttl_eviction(self, monkeypatch):
		telegram_service.set_wizard("123", "addtx", "amount")
		# Force the stored timestamp into the past, past the TTL.
		telegram_service._WIZARDS["123"]["ts"] = time.time() - (telegram_service._WIZARD_TTL_SECONDS + 1)
		assert telegram_service.get_wizard("123") is None  # eviction on next read


# ──────────────────────────────────────────────────────────────────
# /cancel clears active wizard
# ──────────────────────────────────────────────────────────────────

class TestCancel:
	def test_cancel_clears_wizard(self, captured, db_session, linked_user):
		telegram_service.set_wizard("555000", "addtx", "amount", {"type": "expense"})
		assert telegram_service.get_wizard("555000") is not None

		tg_route._handle_update(
			{"message": {"chat": {"id": 555000}, "text": "/cancel"}},
			db_session,
		)

		assert telegram_service.get_wizard("555000") is None
		assert any("Cancelled" in m["text"] for m in captured["sent"])

	def test_cancel_with_no_active_wizard(self, captured, db_session, linked_user):
		tg_route._handle_update(
			{"message": {"chat": {"id": 555000}, "text": "/cancel"}},
			db_session,
		)
		assert any("Nothing to cancel" in m["text"] for m in captured["sent"])


# ──────────────────────────────────────────────────────────────────
# Linking gate
# ──────────────────────────────────────────────────────────────────

class TestLinkRequired:
	def test_unlinked_chat_blocked_from_commands(self, captured, db_session):
		# No linked user for chat 999.
		tg_route._handle_update(
			{"message": {"chat": {"id": 999999}, "text": "/menu"}},
			db_session,
		)
		assert any("isn't linked" in m["text"] for m in captured["sent"])


# ──────────────────────────────────────────────────────────────────
# /menu and /balance render through the no-AI command path
# ──────────────────────────────────────────────────────────────────

class TestSimpleCommands:
	def test_menu_renders_inline_keyboard(self, captured, db_session, linked_user):
		tg_route._handle_update(
			{"message": {"chat": {"id": 555000}, "text": "/menu"}},
			db_session,
		)
		assert captured["sent"], "expected /menu to send a message"
		last = captured["sent"][-1]
		assert last["reply_markup"] is not None
		btn_texts = [b["text"] for row in last["reply_markup"]["inline_keyboard"] for b in row]
		assert "💰 Balance" in btn_texts
		assert "➕ Add tx" in btn_texts

	def test_balance_works_without_groq(self, captured, db_session, linked_user, monkeypatch):
		# Even with no GROQ_API_KEY set, /balance should respond — proves the
		# interactive path is AI-independent.
		monkeypatch.delenv("GROQ_API_KEY", raising=False)
		tg_route._handle_update(
			{"message": {"chat": {"id": 555000}, "text": "/balance"}},
			db_session,
		)
		assert captured["sent"], "expected /balance to reply"
		assert any("Balance" in m["text"] for m in captured["sent"])


# ──────────────────────────────────────────────────────────────────
# /add transaction happy path: message + callbacks → DB row
# ──────────────────────────────────────────────────────────────────

class TestAddTransactionHappyPath:
	def _send_msg(self, db, chat_id, text):
		tg_route._handle_update({"message": {"chat": {"id": chat_id}, "text": text}}, db)

	def _send_callback(self, db, chat_id, data, message_id=42):
		tg_route._handle_update({
			"callback_query": {
				"id": "cbq-1",
				"data": data,
				"message": {"chat": {"id": chat_id}, "message_id": message_id},
			}
		}, db)

	def test_full_flow_creates_transaction(self, captured, db_session, linked_user):
		chat_id = 555000

		# /add → wizard starts at "type"
		self._send_msg(db_session, chat_id, "/add")
		state = telegram_service.get_wizard(str(chat_id))
		assert state["flow"] == "addtx" and state["step"] == "type"

		# Tap "Expense" → advance to amount
		self._send_callback(db_session, chat_id, "addtx:type:expense")
		state = telegram_service.get_wizard(str(chat_id))
		assert state["step"] == "amount"
		assert state["data"]["type"] == "expense"

		# Send amount as text → advance to category
		self._send_msg(db_session, chat_id, "50.5")
		state = telegram_service.get_wizard(str(chat_id))
		assert state["step"] == "category"
		assert state["data"]["amount"] == pytest.approx(50.5)

		# Tap a category → advance to description
		self._send_callback(db_session, chat_id, "addtx:cat:Food & Dining")
		state = telegram_service.get_wizard(str(chat_id))
		assert state["step"] == "description"
		assert state["data"]["category"] == "Food & Dining"

		# Send description as text → advance to confirm
		self._send_msg(db_session, chat_id, "lunch with mom")
		state = telegram_service.get_wizard(str(chat_id))
		assert state["step"] == "confirm"
		assert state["data"]["description"] == "lunch with mom"

		# Tap Save → wizard cleared, DB row created
		self._send_callback(db_session, chat_id, "addtx:save")
		assert telegram_service.get_wizard(str(chat_id)) is None

		tx = db_session.query(Transaction).filter_by(user_id=linked_user.id).first()
		assert tx is not None
		assert float(tx.amount) == pytest.approx(50.5)
		assert tx.category == "Food & Dining"
		assert tx.type == "expense"
		assert tx.description == "lunch with mom"

	def test_amount_rejects_non_number(self, captured, db_session, linked_user):
		chat_id = 555000
		self._send_msg(db_session, chat_id, "/add")
		self._send_callback(db_session, chat_id, "addtx:type:expense")

		# Bad amount
		self._send_msg(db_session, chat_id, "not a number")
		# Still on amount step
		assert telegram_service.get_wizard(str(chat_id))["step"] == "amount"
		assert any("positive number" in m["text"].lower() for m in captured["sent"])
