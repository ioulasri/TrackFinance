from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.dependencies import get_current_user, get_db
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse, GoalStats
from app.schemas.user import UserResponse
from app.services.goal_service import GoalService

router = APIRouter(prefix="/v1/goals", tags=["goals"])


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_data: GoalCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new financial goal.
    
    - **name**: Goal name (required)
    - **icon**: Emoji icon (default: 🎯)
    - **target_amount**: Target amount in MAD (required, must be > 0)
    - **current_amount**: Current saved amount in MAD (default: 0)
    - **deadline**: Optional deadline date
    - **category**: Optional category (e.g., "Emergency Fund", "Travel")
    - **description**: Optional description
    """
    goal = GoalService.create_goal(db, goal_data, current_user.id)
    return goal


@router.get("/", response_model=List[GoalResponse])
def get_goals(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all goals for the current user.
    """
    goals = GoalService.get_user_goals(db, current_user.id)
    return goals


@router.get("/active", response_model=List[GoalResponse])
def get_active_goals(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get active (not completed) goals for the current user.
    """
    goals = GoalService.get_active_goals(db, current_user.id)
    return goals


@router.get("/completed", response_model=List[GoalResponse])
def get_completed_goals(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get completed goals for the current user.
    """
    goals = GoalService.get_completed_goals(db, current_user.id)
    return goals


@router.get("/overdue", response_model=List[GoalResponse])
def get_overdue_goals(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get overdue goals (past deadline and not completed) for the current user.
    """
    goals = GoalService.get_overdue_goals(db, current_user.id)
    return goals


@router.get("/stats", response_model=GoalStats)
def get_goal_stats(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get goal statistics for the current user.
    
    Returns:
    - total_goals: Total number of goals
    - completed_goals: Number of completed goals
    - total_target: Sum of all target amounts
    - total_saved: Sum of all current amounts
    - overall_progress: Overall progress percentage
    """
    stats = GoalService.get_goal_stats(db, current_user.id)
    return stats


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific goal by ID.
    """
    goal = GoalService.get_goal_by_id(db, goal_id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    return goal


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a goal.
    
    All fields are optional. Only provided fields will be updated.
    """
    goal = GoalService.update_goal(db, goal_id, current_user.id, goal_data)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    return goal


@router.patch("/{goal_id}/progress", response_model=GoalResponse)
def update_goal_progress(
    goal_id: int,
    amount: float,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set the current amount for a goal.
    
    - **amount**: New current amount (must be >= 0)
    """
    if amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount cannot be negative"
        )
    
    goal = GoalService.update_goal_progress(db, goal_id, current_user.id, amount)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    return goal


@router.patch("/{goal_id}/add", response_model=GoalResponse)
def add_to_goal(
    goal_id: int,
    amount: float,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add an amount to a goal's current amount.
    
    - **amount**: Amount to add (can be positive or negative)
    """
    goal = GoalService.add_to_goal(db, goal_id, current_user.id, amount)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a goal.
    """
    success = GoalService.delete_goal(db, goal_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    return None
