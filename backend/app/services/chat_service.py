"""
Finance Chat Service

AI-powered chat for TrackFinance using Groq + tool calling. Reused by both the
in-app AIAssistant (HTTP) and the Telegram bot adapter.

Key behaviors:
- The user's current snapshot (balance, monthly income/spending, level, streak)
  is injected into the system prompt every call, so summary questions answer
  without a get_user_context round-trip.
- Tool descriptions are intentionally short — rules live in the system prompt.
- On Groq rate-limit / connection / timeout / 5xx, returns AI_BUSY_MESSAGE
  pointing the user at /menu (Telegram) or to retry shortly.

Tools: get_user_context, get_budgets, get_goals, get_recent_transactions,
get_spending_by_category, add/update/delete_transaction, add/update/delete_budget,
add/update/delete_goal, add_goal_contribution.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.transaction import Transaction, TransactionType
from app.services.transaction_service import TransactionService
from app.services.budget_service import BudgetService
from app.services.goal_service import GoalService
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.schemas.budget import BudgetCreate, BudgetUpdate
from app.schemas.goal import GoalCreate, GoalUpdate
from datetime import datetime, timezone
from typing import Optional, Dict, List
import os
import re
import json
from groq import Groq, RateLimitError, APIStatusError, APIConnectionError, APITimeoutError


AI_BUSY_MESSAGE = (
	"🤖 AI is busy right now. Try /menu for the button interface, "
	"or send your message again in a minute."
)


# ============================================================
# Tool Definitions
# ============================================================

# Tool descriptions are intentionally terse — load-bearing rules live in the
# system prompt, not duplicated per tool. Amounts are MAD. Dates YYYY-MM-DD.
TOOLS = [
	# Reads
	{"type": "function", "function": {
		"name": "get_user_context",
		"description": "Refresh balance / monthly income+spending / level / streak. The system prompt already contains a fresh snapshot; only call if you need updated numbers after a write.",
		"parameters": {"type": "object", "properties": {}}
	}},
	{"type": "function", "function": {
		"name": "get_budgets",
		"description": "List budgets with id, category, limit, spent, remaining, over-budget flag.",
		"parameters": {"type": "object", "properties": {}}
	}},
	{"type": "function", "function": {
		"name": "get_goals",
		"description": "List goals with id, name, target, current, progress%, deadline.",
		"parameters": {"type": "object", "properties": {}}
	}},
	{"type": "function", "function": {
		"name": "get_recent_transactions",
		"description": "Last 10 transactions with integer id, amount, type, category, description, date. Call before update_transaction / delete_transaction.",
		"parameters": {"type": "object", "properties": {}}
	}},
	{"type": "function", "function": {
		"name": "get_spending_by_category",
		"description": "Current-month expenses grouped by category.",
		"parameters": {"type": "object", "properties": {}}
	}},

	# Transactions
	{"type": "function", "function": {
		"name": "add_transaction",
		"description": "Record an income or expense.",
		"parameters": {
			"type": "object",
			"properties": {
				"amount":      {"description": "Positive number"},
				"type":        {"description": "'income' or 'expense'"},
				"category":    {"description": "Category name"},
				"description": {"description": "Optional note"},
				"date":        {"description": "YYYY-MM-DD; default today"}
			},
			"required": ["amount", "type", "category"]
		}
	}},
	{"type": "function", "function": {
		"name": "update_transaction",
		"description": "Update a transaction. Pass only fields the user asked to change.",
		"parameters": {
			"type": "object",
			"properties": {
				"transaction_id": {"description": "Integer id"},
				"amount":         {},
				"type":           {"description": "'income' | 'expense'"},
				"category":       {},
				"description":    {},
				"date":           {"description": "YYYY-MM-DD"}
			},
			"required": ["transaction_id"]
		}
	}},
	{"type": "function", "function": {
		"name": "delete_transaction",
		"description": "Soft-delete a transaction. Reverts budget tracking for expenses.",
		"parameters": {
			"type": "object",
			"properties": {"transaction_id": {"description": "Integer id"}},
			"required": ["transaction_id"]
		}
	}},

	# Budgets
	{"type": "function", "function": {
		"name": "add_budget",
		"description": "Create a monthly budget for a category.",
		"parameters": {
			"type": "object",
			"properties": {
				"category":      {},
				"monthly_limit": {"description": "Positive number"}
			},
			"required": ["category", "monthly_limit"]
		}
	}},
	{"type": "function", "function": {
		"name": "update_budget",
		"description": "Update a budget. Pass only fields the user asked to change.",
		"parameters": {
			"type": "object",
			"properties": {
				"budget_id":     {"description": "Integer id"},
				"monthly_limit": {},
				"category":      {}
			},
			"required": ["budget_id"]
		}
	}},
	{"type": "function", "function": {
		"name": "delete_budget",
		"description": "Delete a budget.",
		"parameters": {
			"type": "object",
			"properties": {"budget_id": {"description": "Integer id"}},
			"required": ["budget_id"]
		}
	}},

	# Goals
	{"type": "function", "function": {
		"name": "add_goal",
		"description": "Create a savings goal.",
		"parameters": {
			"type": "object",
			"properties": {
				"name":          {},
				"target_amount": {"description": "Positive number"},
				"icon":          {"description": "Emoji, e.g. 🎯 💰 ✈️ 🏠"},
				"category":      {},
				"description":   {},
				"deadline":      {"description": "YYYY-MM-DD"}
			},
			"required": ["name", "target_amount"]
		}
	}},
	{"type": "function", "function": {
		"name": "update_goal",
		"description": "Update a goal. Pass only fields the user asked to change.",
		"parameters": {
			"type": "object",
			"properties": {
				"goal_name":     {"description": "Current name"},
				"name":          {},
				"icon":          {},
				"target_amount": {},
				"category":      {},
				"description":   {},
				"deadline":      {"description": "YYYY-MM-DD"}
			},
			"required": ["goal_name"]
		}
	}},
	{"type": "function", "function": {
		"name": "add_goal_contribution",
		"description": "Add to a goal's current savings.",
		"parameters": {
			"type": "object",
			"properties": {
				"goal_name": {},
				"amount":    {"description": "Positive number"}
			},
			"required": ["goal_name", "amount"]
		}
	}},
	{"type": "function", "function": {
		"name": "delete_goal",
		"description": "Delete a goal.",
		"parameters": {
			"type": "object",
			"properties": {"goal_name": {}},
			"required": ["goal_name"]
		}
	}},
]


class FinanceChatService:
	"""
	Handles chat interactions with AI assistant powered by Groq with function calling.
	Delegates all DB operations to existing service classes.
	"""

	def __init__(self):
		api_key = os.getenv("GROQ_API_KEY")
		if not api_key:
			raise ValueError("GROQ_API_KEY environment variable is not set.")
		self.groq_client = Groq(api_key=api_key)
		self.model = "llama-3.3-70b-versatile"

	# ============================================================
	# Main chat entry point
	# ============================================================

	def chat(
		self,
		user_message: str,
		user_id: int,
		db: Session,
		conversation_history: Optional[List[Dict[str, str]]] = None
	) -> Dict:
		# Trim history to last 20 entries (10 exchanges) to avoid Groq token overflow.
		if conversation_history and len(conversation_history) > 20:
			conversation_history = conversation_history[-20:]

		# Pre-inject the user's current snapshot so common summary questions
		# don't need a get_user_context round-trip.
		snapshot = self._get_user_context(user_id, db)
		system_prompt = self._build_system_prompt() + "\n\n" + self._render_snapshot(snapshot)

		messages = self._to_llm_messages(
			user_message=user_message,
			conversation_history=conversation_history,
			system_prompt=system_prompt
		)

		function_called = None
		function_args = None
		assistant_reply = ""

		# Multi-iteration tool loop so batch requests like "delete all my goals" work:
		#   1. AI may return several tool_calls in one response (parallel).
		#   2. AI may then need another round (e.g. get_goals → multiple delete_goal).
		# We loop until the AI returns a plain text reply or we hit the cap.
		MAX_TOOL_ITERATIONS = 6

		try:
			for _iteration in range(MAX_TOOL_ITERATIONS):
				completion = self.groq_client.chat.completions.create(
					model=self.model,
					messages=messages,
					tools=TOOLS,
					tool_choice="auto",
					temperature=0.5,
					max_tokens=1024,
				)
				response = completion.choices[0].message

				if not response.tool_calls:
					# Final answer (or a leaked inline tool call we handle below).
					assistant_reply = response.content or ""
					inline_name, inline_args = self._parse_inline_tool_call(assistant_reply)
					if inline_name:
						function_called = inline_name
						function_args = inline_args
						result = self._handle_tool_call(inline_name, inline_args, user_id, db)
						messages.append({"role": "assistant", "content": assistant_reply})
						messages.append({
							"role": "user",
							"content": (
								f"Function '{inline_name}' returned: {json.dumps(result)}. "
								"Reply to the user in plain English; no function-call syntax."
							),
						})
						# Loop again to get the final natural-language reply.
						continue
					break

				# Append the assistant message with its tool_calls, then run each call.
				messages.append(response)
				for tool_call in response.tool_calls:
					name = tool_call.function.name
					try:
						args = json.loads(tool_call.function.arguments or "{}") or {}
					except json.JSONDecodeError:
						args = {}
					function_called = name
					function_args = args
					result = self._handle_tool_call(name, args, user_id, db)
					messages.append({
						"role": "tool",
						"tool_call_id": tool_call.id,
						"content": json.dumps(result),
					})
			else:
				# Loop fell through without a text reply.
				assistant_reply = (
					assistant_reply
					or "I made several updates but ran out of steps before summarizing. Check /menu for the latest state."
				)

			assistant_reply = self._clean_reply(assistant_reply)

		except (RateLimitError, APIStatusError, APIConnectionError, APITimeoutError) as e:
			print(f"Groq API error ({type(e).__name__}): {str(e)}")
			assistant_reply = AI_BUSY_MESSAGE
		except Exception as e:
			print(f"Chat service error: {str(e)}")
			assistant_reply = AI_BUSY_MESSAGE

		updated_history = conversation_history.copy() if conversation_history else []
		updated_history.append({"role": "user", "content": user_message})
		updated_history.append({"role": "assistant", "content": assistant_reply})

		return {
			"response": assistant_reply,
			"function_called": function_called,
			"function_args": function_args,
			"data": None,
			"conversation_history": updated_history
		}

	def _render_snapshot(self, ctx: Dict) -> str:
		return (
			"Current snapshot (use this directly; do not call get_user_context unless you need fresh numbers after a write):\n"
			f"- balance: {ctx.get('balance', 0):.2f} MAD\n"
			f"- monthly income: {ctx.get('monthly_income', 0):.2f} MAD\n"
			f"- monthly spending: {ctx.get('monthly_spending', 0):.2f} MAD\n"
			f"- level: {ctx.get('level', 0)} · streak: {ctx.get('current_streak', 0)} days · XP: {ctx.get('total_xp', 0)}\n"
			f"- username: {ctx.get('username', 'User')}\n"
			f"- today: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
		)

	# ============================================================
	# Tool call router
	# ============================================================

	def _handle_tool_call(self, function_name: str, args: Dict, user_id: int, db: Session) -> Dict:
		# ── Read ──
		if function_name == "get_user_context":
			return self._get_user_context(user_id, db)
		elif function_name == "get_budgets":
			return self._get_budgets(user_id, db)
		elif function_name == "get_goals":
			return self._get_goals(user_id, db)
		elif function_name == "get_recent_transactions":
			return self._get_recent_transactions(user_id, db)
		elif function_name == "get_spending_by_category":
			return self._get_spending_by_category(user_id, db)

		# ── Transactions ──
		elif function_name == "add_transaction":
			args["amount"] = float(args.get("amount", 0))
			return self._add_transaction(user_id, db, **args)
		elif function_name == "update_transaction":
			try:
				args["transaction_id"] = int(args.get("transaction_id", 0))
			except (ValueError, TypeError):
				return {"success": False, "error": "transaction_id must be an integer from get_recent_transactions"}
			if "amount" in args:
				args["amount"] = float(args["amount"])
			return self._update_transaction(user_id, db, **args)
		elif function_name == "delete_transaction":
			try:
				args["transaction_id"] = int(args.get("transaction_id", 0))
			except (ValueError, TypeError):
				return {"success": False, "error": "transaction_id must be an integer from get_recent_transactions"}
			return self._delete_transaction(user_id, db, **args)

		# ── Budgets ──
		elif function_name == "add_budget":
			args["monthly_limit"] = float(args.get("monthly_limit", 0))
			return self._add_budget(user_id, db, **args)
		elif function_name == "update_budget":
			try:
				args["budget_id"] = int(args.get("budget_id", 0))
			except (ValueError, TypeError):
				return {"success": False, "error": "budget_id must be an integer from get_budgets"}
			if "monthly_limit" in args:
				args["monthly_limit"] = float(args["monthly_limit"])
			return self._update_budget(user_id, db, **args)
		elif function_name == "delete_budget":
			try:
				args["budget_id"] = int(args.get("budget_id", 0))
			except (ValueError, TypeError):
				return {"success": False, "error": "budget_id must be an integer from get_budgets"}
			return self._delete_budget(user_id, db, **args)

		# ── Goals ──
		elif function_name == "add_goal":
			args["target_amount"] = float(args.get("target_amount", 0))
			return self._add_goal(user_id, db, **args)
		elif function_name == "update_goal":
			if "target_amount" in args:
				args["target_amount"] = float(args["target_amount"])
			return self._update_goal(user_id, db, **args)
		elif function_name == "add_goal_contribution":
			args["amount"] = float(args.get("amount", 0))
			return self._add_goal_contribution(user_id, db, **args)
		elif function_name == "delete_goal":
			return self._delete_goal(user_id, db, **args)

		else:
			return {"error": f"Unknown function: {function_name}"}

	# ============================================================
	# Read functions
	# ============================================================

	def _get_user_context(self, user_id: int, db: Session) -> Dict:
		user = db.query(User).filter(User.id == user_id).first()
		if not user:
			return self._empty_context()

		now = datetime.now(timezone.utc)
		month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

		def sum_transactions(type_: str, since=None):
			q = db.query(func.sum(Transaction.amount)).filter(
				Transaction.user_id == user_id,
				Transaction.type == type_,
				Transaction.is_deleted == False,
			)
			if since:
				q = q.filter(Transaction.date >= since)
			return float(q.scalar() or 0.0)

		return {
			"username": user.username,
			"level": user.current_level,
			"total_xp": user.total_xp,
			"current_streak": user.current_streak,
			"balance": sum_transactions("income") - sum_transactions("expense"),
			"monthly_income": sum_transactions("income", month_start),
			"monthly_spending": sum_transactions("expense", month_start),
		}

	def _get_budgets(self, user_id: int, db: Session) -> Dict:
		return BudgetService.get_budget_status(db, user_id)

	def _get_goals(self, user_id: int, db: Session) -> Dict:
		goals = GoalService.get_active_goals(db, user_id)
		stats = GoalService.get_goal_stats(db, user_id)
		return {
			"goals": [
				{
					"id": g.id,
					"name": g.name,
					"icon": g.icon,
					"category": g.category,
					"description": g.description,
					"target_amount": float(g.target_amount),
					"current_amount": float(g.current_amount or 0),
					"progress_percent": round(float(g.current_amount or 0) / float(g.target_amount) * 100, 1),
					"deadline": g.deadline.strftime("%Y-%m-%d") if g.deadline else None,
				}
				for g in goals
			],
			"total_goals": stats.total_goals,
			"completed_goals": stats.completed_goals,
			"total_saved": float(stats.total_saved),
			"total_target": float(stats.total_target),
			"overall_progress": round(float(stats.overall_progress), 1)
		}

	def _get_recent_transactions(self, user_id: int, db: Session) -> Dict:
		transactions = TransactionService.get_user_transactions(db, user_id, skip=0, limit=10)
		return {
			"transactions": [
				{
					"id": t.id,
					"amount": float(t.amount),
					"type": t.type,
					"category": t.category,
					"description": t.description,
					"date": t.date.strftime("%Y-%m-%d"),
				}
				for t in transactions
			],
			"count": len(transactions)
		}

	def _get_spending_by_category(self, user_id: int, db: Session) -> Dict:
		now = datetime.now(timezone.utc)
		month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
		results = db.query(
			Transaction.category,
			func.sum(Transaction.amount).label("total")
		).filter(
			Transaction.user_id == user_id,
			Transaction.type == "expense",
			Transaction.is_deleted == False,
			Transaction.date >= month_start
		).group_by(Transaction.category).all()
		return {
			"spending_by_category": [
				{"category": r.category, "total": float(r.total)} for r in results
			]
		}

	# ============================================================
	# Transaction write functions
	# ============================================================

	def _add_transaction(self, user_id, db, amount, type, category, description=None, date=None) -> Dict:
		err = self._validate_positive_amount(amount, "Transaction amount")
		if err:
			return {"success": False, "error": err}
		try:
			transaction_date = (
				datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
				if date else datetime.now(timezone.utc)
			)
			t = TransactionService.create_transaction(db, user_id, TransactionCreate(
				amount=amount,
				type=TransactionType(type),
				category=category,
				description=description,
				date=transaction_date
			))
			return {"success": True, "message": f"{type.capitalize()} of {amount} MAD in '{category}' added.", "transaction_id": t.id}
		except Exception as e:
			return {"success": False, "error": str(e)}

	def _update_transaction(self, user_id, db, transaction_id, amount=None, type=None, category=None, description=None, date=None) -> Dict:
		try:
			update_data = TransactionUpdate(
				amount=amount,
				type=TransactionType(type) if type else None,
				category=category,
				description=description,
				date=datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc) if date else None
			)
			t = TransactionService.update_transaction(db, user_id, transaction_id, update_data)
			if not t:
				return {"success": False, "error": f"Transaction {transaction_id} not found."}
			return {"success": True, "message": f"Transaction {transaction_id} updated successfully.", "transaction_id": t.id}
		except Exception as e:
			print(f"DEBUG _update_transaction error: {str(e)}")
			return {"success": False, "error": str(e)}

	def _delete_transaction(self, user_id, db, transaction_id) -> Dict:
		try:
			deleted = TransactionService.delete_transaction(db, user_id, transaction_id)
			if not deleted:
				return {"success": False, "error": f"Transaction {transaction_id} not found."}
			return {"success": True, "message": f"Transaction {transaction_id} deleted successfully."}
		except Exception as e:
			return {"success": False, "error": str(e)}

	# ============================================================
	# Budget write functions
	# ============================================================

	def _add_budget(self, user_id, db, category, monthly_limit) -> Dict:
		err = self._validate_positive_amount(monthly_limit, "Monthly limit")
		if err:
			return {"success": False, "error": err}
		try:
			b = BudgetService.create_budget(db, user_id, BudgetCreate(
				category=category,
				monthly_limit=monthly_limit
			))
			return {
				"success": True,
				"message": f"Budget for '{category}' created with a {monthly_limit} MAD monthly limit.",
				"budget_id": b.id,
				"current_spent": float(b.current_spent)
			}
		except ValueError as e:
			return {"success": False, "error": str(e)}
		except Exception as e:
			return {"success": False, "error": str(e)}

	def _update_budget(self, user_id, db, budget_id, monthly_limit=None, category=None) -> Dict:
		try:
			b = BudgetService.update_budget(db, budget_id, user_id, BudgetUpdate(
				monthly_limit=monthly_limit,
				category=category
			))
			if not b:
				return {"success": False, "error": f"Budget {budget_id} not found."}
			return {
				"success": True,
				"message": f"Budget {budget_id} updated successfully.",
				"budget_id": b.id,
				"category": b.category,
				"monthly_limit": float(b.monthly_limit)
			}
		except ValueError as e:
			return {"success": False, "error": str(e)}
		except Exception as e:
			return {"success": False, "error": str(e)}

	def _delete_budget(self, user_id, db, budget_id) -> Dict:
		try:
			deleted = BudgetService.delete_budget(db, budget_id, user_id)
			if not deleted:
				return {"success": False, "error": f"Budget {budget_id} not found."}
			return {"success": True, "message": f"Budget {budget_id} deleted successfully."}
		except Exception as e:
			return {"success": False, "error": str(e)}

	# ============================================================
	# Goal write functions
	# ============================================================

	def _add_goal(self, user_id, db, name, target_amount, icon="🎯", category=None, description=None, deadline=None) -> Dict:
		err = self._validate_positive_amount(target_amount, "Target amount")
		if err:
			return {"success": False, "error": err}
		try:
			g = GoalService.create_goal(db, GoalCreate(
				name=name,
				icon=icon,
				target_amount=target_amount,
				current_amount=0.0,
				category=category,
				description=description,
				deadline=datetime.strptime(deadline, "%Y-%m-%d").date() if deadline else None
			), user_id)
			return {"success": True, "message": f"Goal '{name}' created with a {target_amount} MAD target.", "goal_id": g.id}
		except Exception as e:
			return {"success": False, "error": str(e)}

	def _update_goal(self, user_id, db, goal_name, name=None, icon=None, target_amount=None, category=None, description=None, deadline=None) -> Dict:
		if target_amount is not None:
			err = self._validate_positive_amount(target_amount, "Target amount")
			if err:
				return {"success": False, "error": err}
		try:
			goals = GoalService.get_user_goals(db, user_id)
			goal, err = self._find_goal(goals, goal_name)
			if err:
				return {"success": False, "error": err}

			# Build update with only provided fields
			update_kwargs = {}
			if name is not None:
				update_kwargs["name"] = name
			if icon is not None:
				update_kwargs["icon"] = icon
			if target_amount is not None:
				update_kwargs["target_amount"] = target_amount
			if category is not None:
				update_kwargs["category"] = category
			if description is not None:
				update_kwargs["description"] = description
			if deadline is not None:
				update_kwargs["deadline"] = datetime.strptime(deadline, "%Y-%m-%d").date()

			updated = GoalService.update_goal(db, goal.id, user_id, GoalUpdate(**update_kwargs))
			if not updated:
				return {"success": False, "error": "Update failed."}

			return {
				"success": True,
				"message": f"Goal '{goal.name}' updated successfully.",
				"goal_id": updated.id
			}
		except Exception as e:
			return {"success": False, "error": str(e)}

	def _add_goal_contribution(self, user_id, db, goal_name, amount) -> Dict:
		err = self._validate_positive_amount(amount, "Contribution amount")
		if err:
			return {"success": False, "error": err}
		try:
			goals = GoalService.get_user_goals(db, user_id)
			goal, err = self._find_goal(goals, goal_name)
			if err:
				return {"success": False, "error": err}

			updated = GoalService.add_to_goal(db, goal.id, user_id, amount)
			progress = round(float(updated.current_amount) / float(updated.target_amount) * 100, 1)
			completed = float(updated.current_amount) >= float(updated.target_amount)

			return {
				"success": True,
				"message": f"Added {amount} MAD to '{updated.name}'.",
				"current_amount": float(updated.current_amount),
				"target_amount": float(updated.target_amount),
				"progress_percent": progress,
				"completed": completed
			}
		except Exception as e:
			return {"success": False, "error": str(e)}

	def _delete_goal(self, user_id, db, goal_name) -> Dict:
		try:
			goals = GoalService.get_user_goals(db, user_id)
			goal, err = self._find_goal(goals, goal_name)
			if err:
				return {"success": False, "error": err}

			deleted = GoalService.delete_goal(db, goal.id, user_id)
			if not deleted:
				return {"success": False, "error": "Delete failed."}

			return {"success": True, "message": f"Goal '{goal.name}' deleted successfully."}
		except Exception as e:
			return {"success": False, "error": str(e)}

	# ============================================================
	# Helpers
	# ============================================================

	def _find_goal(self, goals, goal_name: str):
		"""
		Resolve a goal by name. Returns (goal, error_message).
		Exact match (case-insensitive) wins; otherwise unique substring;
		otherwise returns an error so the assistant can ask the user to disambiguate.
		"""
		target = (goal_name or "").strip().lower()
		if not target:
			return None, "Goal name is required."

		exact = [g for g in goals if g.name.lower() == target]
		if len(exact) == 1:
			return exact[0], None
		if len(exact) > 1:
			names = ", ".join(f"'{g.name}'" for g in exact)
			return None, f"Multiple goals share the name '{goal_name}': {names}."

		partial = [g for g in goals if target in g.name.lower()]
		if len(partial) == 1:
			return partial[0], None
		if len(partial) > 1:
			names = ", ".join(f"'{g.name}'" for g in partial)
			return None, f"Multiple goals match '{goal_name}': {names}. Please be more specific."

		return None, f"No goal found matching '{goal_name}'."

	def _validate_positive_amount(self, amount, label: str = "Amount"):
		"""Return an error string if amount is invalid; otherwise None."""
		try:
			value = float(amount)
		except (TypeError, ValueError):
			return f"{label} must be a number."
		if value <= 0:
			return f"{label} must be a positive number. Got: {value}"
		if value > 10_000_000:
			return f"{label} seems unrealistically large ({value} MAD). Please confirm with the user."
		return None

	def _parse_inline_tool_call(self, text: str):
		"""Fallback for when Groq leaks function calls as plain text."""
		patterns = [
			r'<function[=(](\w+)[)>]\s*(\{.*?\})',
			r'<function=(\w+)>(\{.*?\})</function>',
			r'<function\((\w+)\)\((\{.*?\})\)>',
		]
		for pattern in patterns:
			match = re.search(pattern, text, re.DOTALL)
			if match:
				try:
					return match.group(1), json.loads(match.group(2))
				except json.JSONDecodeError:
					continue
		return None, None

	def _clean_reply(self, text: str) -> str:
		"""Strip any leaked function call tags from the reply."""
		text = re.sub(r'<function[^>]*>.*?</function>', '', text, flags=re.DOTALL)
		text = re.sub(r'<function\(.*?\)\(.*?\)>', '', text, flags=re.DOTALL)
		text = re.sub(r'<function[^>]*>', '', text)
		return text.strip()

	def _empty_context(self) -> Dict:
		return {
			"balance": 0.0, "monthly_income": 0.0, "monthly_spending": 0.0,
			"level": 0, "total_xp": 0, "current_streak": 0, "username": "User",
		}

	def _build_system_prompt(self) -> str:
		return (
			"You are the TrackFinance AI assistant. Personal finance only. All amounts in MAD. "
			"Be concise (≤ 5 sentences). Reply in plain English; never output function-call markup.\n"
			"\n"
			"Rules:\n"
			"1. Confirm any write (add/update/delete/contribute) with a one-line summary before calling its tool. "
			"For batch requests (\"add these 4 transactions\", \"delete all my goals\"), confirm the full list ONCE, "
			"then issue all the tool calls — you can return multiple tool_calls in one response, or chain them across turns.\n"
			"2. To update or delete by id, call the matching read tool first (get_recent_transactions / get_budgets / get_goals) "
			"so you have real integer ids. For \"delete all X\", call the list tool, then call delete_X for every returned id.\n"
			"3. When updating, pass only fields the user asked to change.\n"
			"4. The 'Current snapshot' below has fresh balance / income / spending / level / streak — answer summary questions "
			"directly without calling get_user_context.\n"
			"5. For per-category, per-budget, per-goal, or per-transaction questions, call the matching read tool first.\n"
			"6. On a tool failure ({\"success\": false}), state the problem plainly; don't silently retry. "
			"If some calls in a batch succeed and others fail, summarize both groups in your final reply.\n"
			"7. For non-finance questions, decline in one sentence with no tool call.\n"
			"\n"
			"Dates: 'today' is the date in the snapshot. Date args must be YYYY-MM-DD."
		)

	def _to_llm_messages(self, user_message, conversation_history, system_prompt) -> List[Dict]:
		messages = [{"role": "system", "content": system_prompt}]
		if conversation_history:
			messages.extend(conversation_history)
		messages.append({"role": "user", "content": user_message})
		return messages