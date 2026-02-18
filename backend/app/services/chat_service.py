"""
Finance Chat Service

Provides AI-powered chat assistance for financial queries using Groq with function calling.
Uses existing service classes for all read/write operations.

Tools available:
  Read:    get_user_context, get_budgets, get_goals, get_recent_transactions, get_spending_by_category
  Trans:   add_transaction, update_transaction, delete_transaction
  Budget:  add_budget, update_budget, delete_budget
  Goals:   add_goal, update_goal, add_goal_contribution, delete_goal
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
from groq import Groq


# ============================================================
# Tool Definitions
# ============================================================

TOOLS = [

    # ── Read ──────────────────────────────────────────────────

    {
        "type": "function",
        "function": {
            "name": "get_user_context",
            "description": "Get the user's current balance, monthly income, monthly spending, level, and XP. Call this for financial summaries or overview questions.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_budgets",
            "description": "Get all the user's budgets: monthly limit, amount spent, remaining, and over-budget status for each category.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_goals",
            "description": "Get all the user's financial goals with target, current amount, progress percentage, and deadline.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_transactions",
            "description": "Get the user's 10 most recent transactions. Each has a numeric 'id', amount, type, category, description, and date. Always call this before update_transaction or delete_transaction to find the correct integer ID.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_spending_by_category",
            "description": "Get the user's expense spending grouped by category for the current month.",
            "parameters": {"type": "object", "properties": {}}
        }
    },

    # ── Transactions ───────────────────────────────────────────

    {
        "type": "function",
        "function": {
            "name": "add_transaction",
            "description": "Add a new income or expense transaction. Automatically updates budget tracking for expenses and awards XP. Confirm all details with the user before calling.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount":      {"description": "Positive number e.g. 50.0"},
                    "type":        {"description": "Exactly 'income' or 'expense'"},
                    "category":    {"description": "Category e.g. Food, Salary, Transport"},
                    "description": {"description": "Optional note"},
                    "date":        {"description": "YYYY-MM-DD — use today if not specified"}
                },
                "required": ["amount", "type", "category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_transaction",
            "description": (
                "Update specific fields of an existing transaction. "
                "RULES: (1) Call get_recent_transactions first and use the integer 'id'. "
                "(2) Only pass fields the user explicitly asked to change. "
                "(3) Never invent or assume values for fields not mentioned."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_id": {"description": "Integer ID from get_recent_transactions — never a description"},
                    "amount":         {"description": "New amount — only if user asked to change it"},
                    "type":           {"description": "'income' or 'expense' — only if user asked to change it"},
                    "category":       {"description": "New category — only if user asked to change it"},
                    "description":    {"description": "New description — only if user asked to change it"},
                    "date":           {"description": "New date YYYY-MM-DD — only if user asked to change it"}
                },
                "required": ["transaction_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_transaction",
            "description": "Soft-delete a transaction. Also reverts budget tracking for expense transactions. Call get_recent_transactions first to get the correct integer ID. Always confirm with the user before deleting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_id": {"description": "Integer ID from get_recent_transactions"}
                },
                "required": ["transaction_id"]
            }
        }
    },

    # ── Budgets ────────────────────────────────────────────────

    {
        "type": "function",
        "function": {
            "name": "add_budget",
            "description": "Create a new monthly budget for a spending category. Auto-calculates current spending. Confirm category and limit with user first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category":      {"description": "Category e.g. Food, Transport, Entertainment"},
                    "monthly_limit": {"description": "Monthly limit as a positive number in MAD e.g. 500.0"}
                },
                "required": ["category", "monthly_limit"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_budget",
            "description": "Update a budget's monthly limit or category name. Call get_budgets first to get the correct integer budget ID. Only pass fields the user asked to change.",
            "parameters": {
                "type": "object",
                "properties": {
                    "budget_id":     {"description": "Integer ID from get_budgets"},
                    "monthly_limit": {"description": "New monthly limit in MAD — only if user asked to change it"},
                    "category":      {"description": "New category name — only if user asked to change it"}
                },
                "required": ["budget_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_budget",
            "description": "Delete a budget. Call get_budgets first to get the correct integer budget ID. Always confirm with the user before deleting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "budget_id": {"description": "Integer ID from get_budgets"}
                },
                "required": ["budget_id"]
            }
        }
    },

    # ── Goals ──────────────────────────────────────────────────

    {
        "type": "function",
        "function": {
            "name": "add_goal",
            "description": "Create a new financial savings goal. Confirm name and target with user first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name":          {"description": "Goal name e.g. Emergency Fund, Vacation"},
                    "target_amount": {"description": "Target amount as a positive number in MAD e.g. 5000.0"},
                    "icon":          {"description": "Emoji representing the goal e.g. 🎯 💰 ✈️ 🏠"},
                    "category":      {"description": "Optional category e.g. Travel, Investment, Emergency"},
                    "description":   {"description": "Optional description"},
                    "deadline":      {"description": "Optional deadline in YYYY-MM-DD format"}
                },
                "required": ["name", "target_amount"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_goal",
            "description": "Update a goal's name, icon, target amount, deadline, category, or description. Call get_goals first to find the correct goal name. Only pass fields the user asked to change.",
            "parameters": {
                "type": "object",
                "properties": {
                    "goal_name":     {"description": "Current name of the goal to identify it"},
                    "name":          {"description": "New name — only if user asked to change it"},
                    "icon":          {"description": "New emoji icon — only if user asked to change it"},
                    "target_amount": {"description": "New target amount in MAD — only if user asked to change it"},
                    "category":      {"description": "New category — only if user asked to change it"},
                    "description":   {"description": "New description — only if user asked to change it"},
                    "deadline":      {"description": "New deadline YYYY-MM-DD — only if user asked to change it"}
                },
                "required": ["goal_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_goal_contribution",
            "description": "Add an amount to an existing goal's current savings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "goal_name": {"description": "Name of the goal to contribute to"},
                    "amount":    {"description": "Amount to add as a positive number in MAD e.g. 200.0"}
                },
                "required": ["goal_name", "amount"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_goal",
            "description": "Delete a financial goal permanently. Call get_goals first to confirm the goal name. Always confirm with the user before deleting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "goal_name": {"description": "Name of the goal to delete"}
                },
                "required": ["goal_name"]
            }
        }
    },
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
        self.model = "llama-3.1-8b-instant"

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
        messages = self._to_llm_messages(
            user_message=user_message,
            conversation_history=conversation_history,
            system_prompt=self._build_system_prompt()
        )

        function_called = None
        function_args = None

        try:
            completion = self.groq_client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.5,
                max_tokens=1024,
            )

            response = completion.choices[0].message

            if response.tool_calls:
                # Happy path: Groq used the proper tool_calls API
                tool_call = response.tool_calls[0]
                function_called = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments or "{}") or {}

                result = self._handle_tool_call(function_called, function_args, user_id, db)

                messages.append(response)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result)
                })

                final = self.groq_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.5,
                    max_tokens=1024,
                )
                assistant_reply = final.choices[0].message.content or ""

            else:
                # Fallback: Groq leaked the function call as plain text
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
                            f"The function '{inline_name}' was called and returned: {json.dumps(result)}. "
                            "Give the user a friendly, concise response. "
                            "Do not include any function call syntax in your reply."
                        )
                    })

                    final = self.groq_client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        temperature=0.5,
                        max_tokens=1024,
                    )
                    assistant_reply = final.choices[0].message.content or ""

            assistant_reply = self._clean_reply(assistant_reply)

        except Exception as e:
            print(f"Groq API error: {str(e)}")
            assistant_reply = "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again later."

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
        try:
            # Find goal by name
            goals = GoalService.get_user_goals(db, user_id)
            goal = next((g for g in goals if goal_name.lower() in g.name.lower()), None)
            if not goal:
                return {"success": False, "error": f"No goal found matching '{goal_name}'."}

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
        try:
            goals = GoalService.get_user_goals(db, user_id)
            goal = next((g for g in goals if goal_name.lower() in g.name.lower()), None)
            if not goal:
                return {"success": False, "error": f"No goal found matching '{goal_name}'."}

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
            goal = next((g for g in goals if goal_name.lower() in g.name.lower()), None)
            if not goal:
                return {"success": False, "error": f"No goal found matching '{goal_name}'."}

            deleted = GoalService.delete_goal(db, goal.id, user_id)
            if not deleted:
                return {"success": False, "error": "Delete failed."}

            return {"success": True, "message": f"Goal '{goal.name}' deleted successfully."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ============================================================
    # Helpers
    # ============================================================

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
        return {"balance": 0.0, "monthly_income": 0.0, "monthly_spending": 0.0, "level": 1, "total_xp": 0, "username": "User"}

    def _build_system_prompt(self) -> str:
        return """You are a helpful AI financial assistant for TrackFinance. All amounts are in MAD (Moroccan Dirham).

RULES YOU MUST ALWAYS FOLLOW:
- Always use tools to fetch real data before answering — never guess or invent numbers.
- For ANY write action (add/update/delete): confirm details with the user first.
- When updating or deleting a transaction: call get_recent_transactions first to get the integer ID.
- When updating or deleting a budget: call get_budgets first to get the integer ID.
- When updating, only pass the fields the user explicitly asked to change. Never invent values.
- If the user asks about anything unrelated to finance (weather, news, etc.), politely decline — do NOT call any tools.
- Never output raw function call syntax in your responses.

YOUR CAPABILITIES:
  Transactions : add, update (specific fields only), delete
  Budgets      : add, update (limit or category), delete
  Goals        : add, update, contribute to, delete
  Read         : balance overview, budgets, goals, recent transactions, spending by category

This app was built by Imad OULASRI — github.com/ioulasri — imad.oulasri01@gmail.com

Be concise, friendly, and encouraging. Use the user's level and XP to motivate good habits.
"""

    def _to_llm_messages(self, user_message, conversation_history, system_prompt) -> List[Dict]:
        messages = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})
        return messages