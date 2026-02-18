"""
Finance Chat Service

Provides AI-powered chat assistance for financial queries using Groq.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import Goal
from datetime import datetime
from typing import Optional, Dict, List
import os
from groq import Groq


class FinanceChatService:
    """
    Handles chat interactions with AI assistant powered by Groq.
    """

    def __init__(self):
        """Initialize the chat service with Groq client."""
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set.")
        self.groq_client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"  # Best free-tier model

    def chat(
        self,
        user_message: str,
        user_id: int,
        db: Session,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict:
        """
        Process a chat message and return AI assistant response.

        Args:
            user_message: The user's message/question
            user_id: ID of the current user
            db: Database session
            conversation_history: Previous messages in format [{"role": "user"|"assistant", "content": "..."}]

        Returns:
            Dict with keys:
                - response: str - The assistant's reply
                - function_called: Optional[str]
                - function_args: Optional[Dict]
                - data: Optional[Dict]
                - conversation_history: List[Dict]
        """
        # Step 1: Gather user's financial context
        user_context = self._get_user_context(user_id, db)

        # Step 2: Build system prompt with user context
        system_prompt = self._build_system_prompt(user_context)

        # Step 3: Format messages for LLM
        messages = self._to_llm_messages(
            user_message=user_message,
            conversation_history=conversation_history,
            system_prompt=system_prompt
        )

        # Step 4: Call Groq API
        try:
            completion = self.groq_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            assistant_reply = completion.choices[0].message.content
        except Exception as e:
            print(f"Groq API error: {str(e)}")
            assistant_reply = "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again later."

        # Step 5: Update conversation history
        updated_history = conversation_history.copy() if conversation_history else []
        updated_history.append({"role": "user", "content": user_message})
        updated_history.append({"role": "assistant", "content": assistant_reply})

        # Step 6: Return response
        return {
            "response": assistant_reply,
            "function_called": None,
            "function_args": None,
            "data": {
                "user_context": user_context
            },
            "conversation_history": updated_history
        }

    def _get_user_context(self, user_id: int, db: Session) -> Dict:
        """Gather high-level financial context for the user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return self._empty_context()

        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)

        monthly_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income",
            Transaction.date >= month_start
        ).scalar() or 0.0

        monthly_spending = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= month_start
        ).scalar() or 0.0

        total_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income"
        ).scalar() or 0.0

        total_expenses = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense"
        ).scalar() or 0.0

        balance = total_income - total_expenses

        budget_count = db.query(Budget).filter(Budget.user_id == user_id).count()
        goal_count = db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.is_completed == False
        ).count()

        return {
            "balance": float(balance),
            "monthly_income": float(monthly_income),
            "monthly_spending": float(monthly_spending),
            "budget_count": budget_count,
            "goal_count": goal_count,
            "level": user.current_level,
            "total_xp": user.total_xp,
            "username": user.username
        }

    def _empty_context(self) -> Dict:
        """Return empty context when user not found."""
        return {
            "balance": 0.0,
            "monthly_income": 0.0,
            "monthly_spending": 0.0,
            "budget_count": 0,
            "goal_count": 0,
            "level": 1,
            "total_xp": 0,
            "username": "User"
        }

    def _build_system_prompt(self, context: Dict) -> str:
        """Build a system prompt that includes user financial context."""
        return f"""You are a helpful AI financial assistant for TrackFinance, a gamified personal finance tracking app.

You have access to the following information about the user:
- Username: {context['username']}
- Current Level: {context['level']}
- Total XP: {context['total_xp']}
- Current Balance: ${context['balance']:.2f}
- This Month's Income: ${context['monthly_income']:.2f}
- This Month's Spending: ${context['monthly_spending']:.2f}
- Active Budgets: {context['budget_count']}
- Active Goals: {context['goal_count']}

Your role is to:
1. Answer questions about the user's finances using the data provided
2. Provide personalized financial advice and insights
3. Help users track their progress and stay motivated
4. Explain budgeting concepts and strategies
5. Be encouraging and supportive about their financial journey

Keep responses concise, friendly, and actionable. Use the gamification aspect (levels, XP) to encourage good financial habits.
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