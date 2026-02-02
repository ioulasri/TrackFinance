from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services.transaction_service import TransactionService
from typing import List

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])

def get_current_user_id(db: Session = Depends(get_db)) -> int:
	raise HTTPException(status_code=401, detail="Authentication not implemented")

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction_data: TransactionCreate, db: Session = Depends(get_db)):
	# TODO: Replace 1 with actual user_id from auth
	user_id = 1
	transaction = TransactionService.create_transaction(db, user_id, transaction_data)
	return transaction

@router.get("/", response_model=List[TransactionResponse])
def list_transactions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
	user_id = 1
	transactions = TransactionService.get_user_transactions(db, user_id, skip, limit)
	return transactions

@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
	user_id = 1
	transaction = TransactionService.get_transaction(db, user_id, transaction_id)

	if not transaction:
		raise HTTPException(status_code=404, detail="Transaction not found")
	
	return transaction

@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(transaction_id: int, update_data: TransactionUpdate, db: Session = Depends(get_db)):
	user_id = 1
	transaction = TransactionService.update_transaction(db, user_id, transaction_id, update_data)

	if not transaction:
		raise HTTPException(status_code=404, detail="Transaction not found")
	
	return transaction

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
	user_id = 1
	success = TransactionService.delete_transaction(db, user_id, transaction_id)

	if not success:
		raise HTTPException(status_code=404, detail="Transaction not found")
	
	return None

