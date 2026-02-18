"""
Finance Chat Service

Provides AI-powered chat assistance for financial queries.
This service prepares user context and conversation structure for LLM integration.

TODO: Integrate Groq API client for actual AI responses.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import Goal
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import os


class FinanceChatService:
    """
    Handles chat interactions with AI assistant.
    
    Responsibilities:
    - Gather user financial context (transactions, budgets, goals, XP)
    - Build system prompts with relevant user data
    - Prepare message format for LLM
    - TODO: Call Groq API for actual AI responses
    """

    def __init__(self):
        """Initialize the chat service."""
        # TODO: Initialize Groq client here when ready
        # Example:
        # self.groq_api_key = os.getenv("GROQ_API_KEY")
        # if self.groq_api_key:
        #     from groq import Groq
        #     self.groq_client = Groq(api_key=self.groq_api_key)
        # else:
        #     self.groq_client = None
        pass

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
                - function_called: Optional[str] - Name of any function called (future use)
                - function_args: Optional[Dict] - Arguments for function calls (future use)
                - data: Optional[Dict] - Additional data (e.g., user_context for debugging)
                - conversation_history: List[Dict] - Updated conversation including this exchange
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

        # Step 4: TODO - Call Groq API for actual AI response
        # ============================================================
        # TODO: Replace this placeholder with actual Groq API call
        # ============================================================
        # Example implementation:
        #
        # try:
        #     if self.groq_client:
        #         completion = self.groq_client.chat.completions.create(
        #             model="mixtral-8x7b-32768",  # or your preferred model
        #             messages=messages,
        #             temperature=0.7,
        #             max_tokens=1024,
        #         )
        #         assistant_reply = completion.choices[0].message.content
        #     else:
        #         assistant_reply = "Groq API key not configured."
        # except Exception as e:
        #     assistant_reply = f"Error calling AI service: {str(e)}"
        #
        # ============================================================

        # PLACEHOLDER: Return a stub response
        assistant_reply = (
            "This is a placeholder AI reply. Once Groq is integrated, I will provide "
            "intelligent answers using your real TrackFinance data.\n\n"
            f"Your current balance: ${user_context['balance']:.2f}\n"
            f"Spending this month: ${user_context['monthly_spending']:.2f}\n"
            f"Level: {user_context['level']}"
        )

        # Step 5: Update conversation history
        updated_history = conversation_history.copy() if conversation_history else []
        updated_history.append({"role": "user", "content": user_message})
        updated_history.append({"role": "assistant", "content": assistant_reply})

        # Step 6: Return response in expected format
        return {
            "response": assistant_reply,
            "function_called": None,  # TODO: Set when implementing function calling
            "function_args": None,    # TODO: Set when implementing function calling
            "data": {
                "user_context": user_context  # Include for debugging
            },
            "conversation_history": updated_history
        }

    def _get_user_context(self, user_id: int, db: Session) -> Dict:
        """
        Gather high-level financial context for the user.
        
        Args:
            user_id: ID of the user
            db: Database session
            
        Returns:
            Dict containing user's financial summary:
                - balance: Current balance (income - expenses)
                - monthly_income: Income for current month
                - monthly_spending: Expenses for current month
                - budget_count: Number of active budgets
                - goal_count: Number of active goals
                - level: User's current level
                - total_xp: User's total XP
        """
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return self._empty_context()

        # Calculate date range for current month
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        
        # Get monthly income
        monthly_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income",
            Transaction.date >= month_start
        ).scalar() or 0.0

        # Get monthly expenses
        monthly_spending = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= month_start
        ).scalar() or 0.0

        # Calculate total balance (all-time)
        total_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "income"
        ).scalar() or 0.0

        total_expenses = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense"
        ).scalar() or 0.0

        balance = total_income - total_expenses

        # Count budgets and goals
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
        """
        Build a system prompt that includes user financial context.
        
        Args:
            context: User financial context from _get_user_context()
            
        Returns:
            System prompt string to be sent to LLM
        """
        prompt = f"""You are a helpful AI financial assistant for TrackFinance, a gamified personal finance tracking app.

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
        return prompt

    def _to_llm_messages(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]],
        system_prompt: str
    ) -> List[Dict[str, str]]:
        """
        Format messages in the structure expected by LLM APIs.
        
        Args:
            user_message: Current user message
            conversation_history: Previous conversation messages
            system_prompt: System prompt with user context
            
        Returns:
            List of message dicts in format: [{"role": "system"|"user"|"assistant", "content": "..."}]
        """
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add conversation history if present
        if conversation_history:
            messages.extend(conversation_history)

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        return messages
