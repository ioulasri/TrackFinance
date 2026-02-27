from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.pdf_service import PDFService
from app.services.transaction_service import TransactionService
from app.services.budget_service import BudgetService
import io
import traceback
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/reports", tags=["reports"])

@router.get("/financial-report")
async def get_financial_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Generating financial report for user: {current_user.username}")
        # 1. Gather data
        transactions = TransactionService.get_user_transactions(db, current_user.id, skip=0, limit=100)
        budgets = BudgetService.get_user_budgets(db, current_user.id)
        
        # Convert models to dicts for the service
        user_data = {
            "username": current_user.username,
            "total_xp": current_user.total_xp,
            "current_level": current_user.current_level,
            "current_streak": current_user.current_streak
        }
        
        tx_list = [
            {
                "date": tx.date.strftime("%Y-%m-%d") if tx.date else "N/A",
                "category": tx.category,
                "type": tx.type,
                "amount": tx.amount,
                "description": tx.description
            } for tx in transactions
        ]
        
        budget_list = [
            {
                "category": b.category,
                "monthly_limit": b.monthly_limit,
                "spent_amount": b.current_spent
            } for b in budgets
        ]
        
        # 2. Generate PDF
        pdf_bytes = PDFService.generate_financial_report(user_data, tx_list, budget_list)
        
        # 3. Return as stream
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=financial_report_{current_user.username}.pdf"
            }
        )
        
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Error generating report: {error_detail}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate report: {str(e)}"
        )
