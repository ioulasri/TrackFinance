"""
Chat API Routes

Endpoints for AI-powered financial chat assistant.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.chat_service import FinanceChatService


router = APIRouter(prefix="/v1/chat", tags=["chat"])


# ============================================================
# Pydantic Models
# ============================================================

class ChatMessage(BaseModel):
    """Request model for chat endpoint."""
    message: str = Field(..., min_length=1, max_length=2000, description="User's message")
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="Previous conversation messages in format [{'role': 'user'|'assistant', 'content': '...'}]"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "message": "How much did I spend this month?",
                "conversation_history": [
                    {"role": "user", "content": "Hello!"},
                    {"role": "assistant", "content": "Hi! How can I help you today?"}
                ]
            }
        }


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    response: str = Field(..., description="AI assistant's reply")
    function_called: Optional[str] = Field(default=None, description="Name of function called (if any)")
    function_args: Optional[Dict] = Field(default=None, description="Arguments passed to function (if any)")
    data: Optional[Dict] = Field(default=None, description="Additional context data")
    conversation_history: List[Dict[str, str]] = Field(
        ...,
        description="Updated conversation history including this exchange"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "response": "This month you've spent $1,234.56 on expenses.",
                "function_called": None,
                "function_args": None,
                "data": {
                    "user_context": {
                        "balance": 5000.00,
                        "monthly_spending": 1234.56
                    }
                },
                "conversation_history": [
                    {"role": "user", "content": "How much did I spend this month?"},
                    {"role": "assistant", "content": "This month you've spent $1,234.56 on expenses."}
                ]
            }
        }


class SuggestionsResponse(BaseModel):
    """Response model for chat suggestions endpoint."""
    suggestions: List[str] = Field(..., description="List of suggested questions")

    class Config:
        json_schema_extra = {
            "example": {
                "suggestions": [
                    "How much did I spend on food last month?",
                    "Am I on track with my budgets?",
                    "What are my biggest expenses this month?"
                ]
            }
        }


# ============================================================
# Endpoints
# ============================================================

@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_with_assistant(
    payload: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to the AI financial assistant.
    
    The assistant has access to your financial data and can answer questions about:
    - Spending and income
    - Budget status
    - Goals progress
    - Financial insights and advice
    
    Args:
        payload: ChatMessage containing the user's message and optional conversation history
        current_user: Authenticated user (from JWT token)
        db: Database session
        
    Returns:
        ChatResponse with assistant's reply and updated conversation history
    """
    try:
        # Initialize chat service
        chat_service = FinanceChatService()
        
        # Process the chat message
        result = chat_service.chat(
            user_message=payload.message,
            user_id=current_user.id,
            db=db,
            conversation_history=payload.conversation_history
        )
        
        # Return response matching frontend expectations
        return ChatResponse(
            response=result["response"],
            function_called=result.get("function_called"),
            function_args=result.get("function_args"),
            data=result.get("data"),
            conversation_history=result["conversation_history"]
        )
        
    except Exception as e:
        # Log error (in production, use proper logging)
        print(f"Chat error for user {current_user.id}: {str(e)}")
        
        # Return a graceful error response
        error_history = payload.conversation_history.copy() if payload.conversation_history else []
        error_history.append({"role": "user", "content": payload.message})
        error_history.append({
            "role": "assistant",
            "content": "I'm sorry, I'm having trouble processing your request right now. Please try again later."
        })
        
        return ChatResponse(
            response="I'm sorry, I'm having trouble processing your request right now. Please try again later.",
            function_called=None,
            function_args=None,
            data=None,
            conversation_history=error_history
        )


@router.get("/chat/suggestions", response_model=SuggestionsResponse, status_code=status.HTTP_200_OK)
async def get_chat_suggestions(
    current_user: User = Depends(get_current_user)
):
    """
    Get suggested questions/prompts for the chat assistant.
    
    These are helpful starter questions that users can ask to explore
    the assistant's capabilities.
    
    Args:
        current_user: Authenticated user (from JWT token)
        
    Returns:
        SuggestionsResponse with list of suggested questions
    """
    # Static suggestions - no need for database calls or LLM
    suggestions = [
        "What's my total spending this month?",
        "How much did I spend on food last month?",
        "What are my biggest expenses this month?",
        "Help me set a new budget goal"
    ]
    
    return SuggestionsResponse(suggestions=suggestions)
