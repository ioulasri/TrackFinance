"""
Recurring transactions CRUD.

Endpoints (all require auth):
  GET    /v1/recurring/            — list current user's recurring entries
  POST   /v1/recurring/            — create
  PATCH  /v1/recurring/{id}        — update
  DELETE /v1/recurring/{id}        — delete
  POST   /v1/recurring/{id}/run    — force-run now (handy for testing)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.recurring import (
	RecurringTransactionCreate,
	RecurringTransactionUpdate,
	RecurringTransactionRead,
)
from app.services.recurring_service import RecurringTransactionService, notify_recurring_applied


router = APIRouter(prefix="/v1/recurring", tags=["recurring"])


@router.get("/", response_model=List[RecurringTransactionRead])
def list_recurring(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return RecurringTransactionService.list_for_user(db, current_user.id)


@router.post("/", response_model=RecurringTransactionRead, status_code=status.HTTP_201_CREATED)
def create_recurring(
	payload: RecurringTransactionCreate,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return RecurringTransactionService.create(db, current_user.id, payload)


@router.patch("/{rid}", response_model=RecurringTransactionRead)
def update_recurring(
	rid: int,
	payload: RecurringTransactionUpdate,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	updated = RecurringTransactionService.update(db, current_user.id, rid, payload)
	if not updated:
		raise HTTPException(status_code=404, detail="Not found")
	return updated


@router.delete("/{rid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(
	rid: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	if not RecurringTransactionService.delete(db, current_user.id, rid):
		raise HTTPException(status_code=404, detail="Not found")
	return None


@router.post("/{rid}/run", response_model=RecurringTransactionRead)
def run_recurring_now(
	rid: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	"""Force this recurring entry to run on the next process tick — handy for testing."""
	row = RecurringTransactionService.get(db, current_user.id, rid)
	if not row:
		raise HTTPException(status_code=404, detail="Not found")
	row.next_run_date = datetime.now(timezone.utc)
	db.commit()
	# Process synchronously and notify.
	applied = RecurringTransactionService.process_due(db)
	for r, tx in applied:
		notify_recurring_applied(db, r, tx)
	db.refresh(row)
	return row
