from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services.transaction_service import TransactionService
from app.api.dependencies import get_current_user
from app.models.user import User
from typing import List

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
	transaction_data: TransactionCreate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	transaction = TransactionService.create_transaction(db, current_user.id, transaction_data)
	return transaction

@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
	skip: int = 0,
	limit: int = 10,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	transactions = TransactionService.get_user_transactions(db, current_user.id, skip, limit)
	return transactions

@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
	transaction_id: int, 
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	transaction = TransactionService.get_transaction(db, current_user.id, transaction_id)

	if not transaction:
		raise HTTPException(status_code=404, detail="Transaction not found")
	
	return transaction

@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
	transaction_id: int, 
	update_data: TransactionUpdate, 
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	transaction = TransactionService.update_transaction(db, current_user.id, transaction_id, update_data)

	if not transaction:
		raise HTTPException(status_code=404, detail="Transaction not found")
	
	return transaction

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
	transaction_id: int, 
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	success = TransactionService.delete_transaction(db, current_user.id, transaction_id)

	if not success:
		raise HTTPException(status_code=404, detail="Transaction not found")
	
	return None

