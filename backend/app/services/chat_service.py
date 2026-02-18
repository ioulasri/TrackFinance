"""
Finance Chat Service

Provides AI-powered chat assistance for financial queries using Groq with function calling.
Uses existing service classes for all read/write operations.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import Goal
from app.services.transaction_service import TransactionService
from app.services.budget_service import BudgetService
from app.services.goal_service import GoalService
from app.schemas.transaction import TransactionCreate
from app.schemas.budget import BudgetCreate
from app.schemas.goal import GoalCreate
from app.models.transaction import TransactionType
from datetime import datetime, timezone, date
from typing import Optional, Dict, List
import os
import json
from groq import Groq


# ============================================================
# Tool Definitions - What the AI can request
# ============================================================

TOOLS = [
    # --- Read Tools ---
    {
        "type": "function",
        "function": {
            "name": "get_user_context",
            "description": "Get the user's current balance, monthly income, monthly spending, level, and XP",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_budgets",
            "description": "Get all the user's budgets, their monthly limit, how much has been spent, remaining amount, and whether any are over budget",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_goals",
            "description": "Get all the user's financial goals, their target amounts, current saved amounts, deadlines, and progress percentage",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_transactions",
            "description": "Get the user's most recent transactions including amount, type, category, description and date",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of transactions to return (default 10, max 50)"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_spending_by_category",
            "description": "Get the user's expense spending broken down by category for the current month",
            "parameters": {"type": "object", "properties": {}}
        }
    },

    # --- Write Tools ---
    {
        "type": "function",
        "function": {
            "name": "add_transaction",
            "description": "Add a new income or expense transaction for the user. Also automatically updates budget tracking for expenses and awards XP.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "Transaction amount (must be positive)"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "Whether this is income or an expense"
                    },
                    "category": {
                        "type": "string",
                        "description": "Category of the transaction e.g. Food, Salary, Transport, Entertainment"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description or note for the transaction"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date of the transaction in YYYY-MM-DD format. Use today if not specified."
                    }
                },
                "required": ["amount", "type", "category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_budget",
            "description": "Create a new monthly budget for a specific spending category. Automatically calculates current spending for that category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "The spending category to budget for e.g. Food, Transport, Entertainment"
                    },
                    "monthly_limit": {
                        "type": "number",
                        "description": "The monthly spending limit in MAD (must be positive)"
                    }
                },
                "required": ["category", "monthly_limit"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_goal",
            "description": "Create a new financial savings goal for the user",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the goal e.g. Emergency Fund, New Laptop, Vacation"
                    },
                    "target_amount": {
                        "type": "number",
                        "description": "Target amount to save in MAD"
                    },
                    "icon": {
                        "type": "string",
                        "description": "An emoji icon that represents the goal e.g. 🎯 💰 ✈️ 🏠"
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category e.g. Emergency Fund, Travel, Investment"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description of the goal"
                    },
                    "deadline": {
                        "type": "string",
                        "description": "Optional deadline in YYYY-MM-DD format"
                    }
                },
                "required": ["name", "target_amount"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_goal_contribution",
            "description": "Add money to an existing financial goal to update the current saved amount",
            "parameters": {
                "type": "object",
                "properties": {
                    "goal_name": {
                        "type": "string",
                        "description": "Name of the goal to contribute to"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Amount to add to the goal in MAD"
                    }
                },
                "required": ["goal_name", "amount"]
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
        """Initialize the chat service with Groq client."""
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set.")
        self.groq_client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"

    def chat(
        self,
        user_message: str,
        user_id: int,
        db: Session,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict:
        """
        Process a chat message and return AI assistant response.
        Uses function calling so the AI fetches real-time data and performs actions when needed.
        """
        messages = self._to_llm_messages(
            user_message=user_message,
            conversation_history=conversation_history,
            system_prompt=self._build_system_prompt()
        )

        function_called = None
        function_args = None

        try:
            # First call - let Groq decide if it needs to call a tool
            completion = self.groq_client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1024,
            )

            response = completion.choices[0].message

            # If Groq wants to call a function, handle it
            if response.tool_calls:
                tool_call = response.tool_calls[0]
                function_called = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}

                # Execute the function
                result = self._handle_tool_call(function_called, function_args, user_id, db)

                # Send the result back to Groq to form the final answer
                messages.append(response)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result)
                })

                final_completion = self.groq_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1024,
                )
                assistant_reply = final_completion.choices[0].message.content
            else:
                assistant_reply = response.content

        except Exception as e:
            print(f"Groq API error: {str(e)}")
            assistant_reply = "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again later."

        # Update conversation history
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
        """Route tool calls from Groq to the correct function."""
        if function_name == "get_user_context":
            return self._get_user_context(user_id, db)
        elif function_name == "get_budgets":
            return self._get_budgets(user_id, db)
        elif function_name == "get_goals":
            return self._get_goals(user_id, db)
        elif function_name == "get_recent_transactions":
            return self._get_recent_transactions(user_id, db, limit=args.get("limit", 10))
        elif function_name == "get_spending_by_category":
            return self._get_spending_by_category(user_id, db)
        elif function_name == "add_transaction":
            return self._add_transaction(user_id, db, **args)
        elif function_name == "add_budget":
            return self._add_budget(user_id, db, **args)
        elif function_name == "add_goal":
            return self._add_goal(user_id, db, **args)
        elif function_name == "add_goal_contribution":
            return self._add_goal_contribution(user_id, db, **args)
        else:
            return {"error": f"Unknown function: {function_name}"}

    # ============================================================
    # Read functions
    # ============================================================

    def _get_user_context(self, user_id: int, db: Session) -> Dict:
        """Get high-level financial summary for the user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return self._empty_context()

        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

        monthly_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income",
            Transaction.is_deleted == False,
            Transaction.date >= month_start
        ).scalar() or 0.0

        monthly_spending = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.is_deleted == False,
            Transaction.date >= month_start
        ).scalar() or 0.0

        total_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income",
            Transaction.is_deleted == False,
        ).scalar() or 0.0

        total_expenses = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.is_deleted == False,
        ).scalar() or 0.0

        return {
            "balance": float(total_income - total_expenses),
            "monthly_income": float(monthly_income),
            "monthly_spending": float(monthly_spending),
            "level": user.current_level,
            "total_xp": user.total_xp,
            "username": user.username
        }

    def _get_budgets(self, user_id: int, db: Session) -> Dict:
        """Get user's budgets using BudgetService."""
        return BudgetService.get_budget_status(db, user_id)

    def _get_goals(self, user_id: int, db: Session) -> Dict:
        """Get user's active goals using GoalService."""
        goals = GoalService.get_active_goals(db, user_id)

        goal_list = [
            {
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
        ]

        stats = GoalService.get_goal_stats(db, user_id)

        return {
            "goals": goal_list,
            "total_goals": stats.total_goals,
            "completed_goals": stats.completed_goals,
            "total_saved": float(stats.total_saved),
            "total_target": float(stats.total_target),
            "overall_progress": round(float(stats.overall_progress), 1)
        }

    def _get_recent_transactions(self, user_id: int, db: Session, limit: int = 10) -> Dict:
        """Get user's most recent transactions using TransactionService."""
        limit = min(limit, 50)
        transactions = TransactionService.get_user_transactions(db, user_id, skip=0, limit=limit)

        return {
            "transactions": [
                {
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
        """Get current month spending grouped by category."""
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
                {"category": row.category, "total": float(row.total)}
                for row in results
            ]
        }

    # ============================================================
    # Write functions — delegate to existing service classes
    # ============================================================

    def _add_transaction(
        self,
        user_id: int,
        db: Session,
        amount: float,
        type: str,
        category: str,
        description: str = None,
        date: str = None
    ) -> Dict:
        """Add a transaction via TransactionService (handles XP + budget tracking)."""
        try:
            transaction_date = (
                datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if date
                else datetime.now(timezone.utc)
            )

            transaction_data = TransactionCreate(
                amount=amount,
                type=TransactionType(type),
                category=category,
                description=description,
                date=transaction_date
            )

            transaction = TransactionService.create_transaction(db, user_id, transaction_data)

            return {
                "success": True,
                "message": f"Transaction added: {type} of {amount} MAD in '{category}'",
                "transaction_id": transaction.id
            }
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _add_budget(
        self,
        user_id: int,
        db: Session,
        category: str,
        monthly_limit: float
    ) -> Dict:
        """Create a budget via BudgetService (handles duplicate check + current_spent calculation)."""
        try:
            budget_data = BudgetCreate(
                category=category,
                monthly_limit=monthly_limit
            )

            budget = BudgetService.create_budget(db, user_id, budget_data)

            return {
                "success": True,
                "message": f"Budget created for '{category}' with a monthly limit of {monthly_limit} MAD",
                "budget_id": budget.id,
                "current_spent": float(budget.current_spent)
            }
        except ValueError as e:
            # Catches the duplicate category error from BudgetService
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _add_goal(
        self,
        user_id: int,
        db: Session,
        name: str,
        target_amount: float,
        icon: str = "🎯",
        category: str = None,
        description: str = None,
        deadline: str = None
    ) -> Dict:
        """Create a goal via GoalService."""
        try:
            deadline_date = (
                datetime.strptime(deadline, "%Y-%m-%d").date()
                if deadline
                else None
            )

            goal_data = GoalCreate(
                name=name,
                icon=icon,
                target_amount=target_amount,
                current_amount=0.0,
                category=category,
                description=description,
                deadline=deadline_date
            )

            goal = GoalService.create_goal(db, goal_data, user_id)

            return {
                "success": True,
                "message": f"Goal '{name}' created with a target of {target_amount} MAD",
                "goal_id": goal.id
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _add_goal_contribution(
        self,
        user_id: int,
        db: Session,
        goal_name: str,
        amount: float
    ) -> Dict:
        """Add a contribution to a goal via GoalService.add_to_goal."""
        try:
            # Find the goal by name
            goals = GoalService.get_user_goals(db, user_id)
            goal = next(
                (g for g in goals if goal_name.lower() in g.name.lower()),
                None
            )

            if not goal:
                return {"success": False, "error": f"No goal found matching '{goal_name}'"}

            updated_goal = GoalService.add_to_goal(db, goal.id, user_id, amount)
            progress = round(float(updated_goal.current_amount) / float(updated_goal.target_amount) * 100, 1)
            completed = float(updated_goal.current_amount) >= float(updated_goal.target_amount)

            return {
                "success": True,
                "message": f"Added {amount} MAD to '{updated_goal.name}'",
                "current_amount": float(updated_goal.current_amount),
                "target_amount": float(updated_goal.target_amount),
                "progress_percent": progress,
                "completed": completed
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ============================================================
    # Helpers
    # ============================================================

    def _empty_context(self) -> Dict:
        """Return empty context when user not found."""
        return {
            "balance": 0.0,
            "monthly_income": 0.0,
            "monthly_spending": 0.0,
            "level": 1,
            "total_xp": 0,
            "username": "User"
        }

    def _build_system_prompt(self) -> str:
        """Lightweight system prompt - AI fetches real-time data via tools."""
        return """You are a helpful AI financial assistant for TrackFinance, a gamified personal finance tracking app. The app uses MAD (Moroccan Dirham) as the currency.

You have access to tools that let you read and write the user's financial data in real time. Always use tools to fetch current data before answering — never guess or make up numbers.

For write actions (adding a transaction, budget, or goal): confirm the key details with the user before calling the tool, unless they have already clearly specified everything needed.

Your role is to:
1. Answer questions about the user's finances using real-time data from your tools
2. Help users add transactions, create budgets, and set financial goals
3. Provide personalized financial advice and insights
4. Help users track progress and stay motivated
5. Be encouraging and use the gamification aspect (levels, XP) to reinforce good habits

Keep responses concise, friendly, and actionable.
"""

    def _to_llm_messages(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]],
        system_prompt: str
    ) -> List[Dict[str, str]]:
        """Format messages in the structure expected by Groq's API."""
        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": user_message})

        return messages