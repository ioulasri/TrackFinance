from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate
from app.services.budget_service import BudgetService
from app.api.dependencies import get_current_user
from app.models.user import User
from typing import List
from app.services.achievement_checker import AchievementChecker

router = APIRouter(prefix="/v1/budgets", tags=["budgets"])

@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
	budget_data: BudgetCreate,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	try:

		budget = BudgetService.create_budget(db, current_user.id, budget_data)

		AchievementChecker.check_budget_achievements(db, current_user.id)

		return budget
	
	except ValueError as e:
		raise HTTPException(status_code=404, detail=str(e))

@router.get("/", response_model=List[BudgetResponse])
def list_budgets(
	skip: int = 0,
	limit: int = 10,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	budgets = BudgetService.get_user_budgets(db, current_user.id)
	return budgets

@router.get("/status")
def get_budget_status(
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	budgets_status = BudgetService.get_budget_status(db, current_user.id)
	return budgets_status

@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget_by_id(
	budget_id: int, 
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	budget = BudgetService.get_budget_by_id(db, budget_id, current_user.id)

	if not budget:
		raise HTTPException(status_code=404, detail="Budget not found")
	
	return budget

@router.patch("/{budget_id}", response_model=BudgetResponse)
def update_budget(
	budget_id: int, 
	update_data: BudgetUpdate, 
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	try:

		budget = BudgetService.update_budget(db, budget_id, current_user.id, update_data)

		if not budget:
			raise HTTPException(status_code=404, detail="Budget not found")

		return budget

	except ValueError as e:
		raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
	budget_id: int, 
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	success = BudgetService.delete_budget(db, budget_id, current_user.id)

	if not success:
		raise HTTPException(status_code=404, detail="Transaction not found")
	
	return None

@router.post("/reset-monthly", status_code=status.HTTP_200_OK)
def reset_monthly_budgets(
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user)
):
	budgets = BudgetService.reset_monthly_budgets(db, current_user.id)
	return {"message": f"Successfully reset {len(budgets)} budgets"}