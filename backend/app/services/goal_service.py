from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate, GoalStats
from typing import List, Optional
from datetime import date


class GoalService:
    """Service layer for goal operations"""

    @staticmethod
    def create_goal(db: Session, goal_data: GoalCreate, user_id: int) -> Goal:
        """Create a new goal for a user"""
        goal = Goal(
            user_id=user_id,
            name=goal_data.name,
            icon=goal_data.icon,
            target_amount=goal_data.target_amount,
            current_amount=goal_data.current_amount,
            deadline=goal_data.deadline,
            category=goal_data.category,
            description=goal_data.description
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def get_user_goals(db: Session, user_id: int) -> List[Goal]:
        """Get all goals for a user"""
        return db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.desc()).all()

    @staticmethod
    def get_goal_by_id(db: Session, goal_id: int, user_id: int) -> Optional[Goal]:
        """Get a specific goal by ID for a user"""
        return db.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == user_id
        ).first()

    @staticmethod
    def update_goal(db: Session, goal_id: int, user_id: int, goal_data: GoalUpdate) -> Optional[Goal]:
        """Update a goal"""
        goal = GoalService.get_goal_by_id(db, goal_id, user_id)
        if not goal:
            return None

        # Update only provided fields
        update_data = goal_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(goal, field, value)

        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def delete_goal(db: Session, goal_id: int, user_id: int) -> bool:
        """Delete a goal"""
        goal = GoalService.get_goal_by_id(db, goal_id, user_id)
        if not goal:
            return False

        db.delete(goal)
        db.commit()
        return True

    @staticmethod
    def update_goal_progress(db: Session, goal_id: int, user_id: int, amount: float) -> Optional[Goal]:
        """Update the current amount for a goal"""
        goal = GoalService.get_goal_by_id(db, goal_id, user_id)
        if not goal:
            return None

        goal.current_amount = max(0, amount)  # Ensure non-negative
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def add_to_goal(db: Session, goal_id: int, user_id: int, amount: float) -> Optional[Goal]:
        """Add an amount to a goal's current amount"""
        goal = GoalService.get_goal_by_id(db, goal_id, user_id)
        if not goal:
            return None

        goal.current_amount += amount
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def get_goal_stats(db: Session, user_id: int) -> GoalStats:
        """Get statistics for user's goals"""
        goals = GoalService.get_user_goals(db, user_id)

        total_goals = len(goals)
        completed_goals = sum(1 for g in goals if g.current_amount >= g.target_amount)
        total_target = sum(g.target_amount for g in goals)
        total_saved = sum(g.current_amount for g in goals)
        overall_progress = (total_saved / total_target * 100) if total_target > 0 else 0

        return GoalStats(
            total_goals=total_goals,
            completed_goals=completed_goals,
            total_target=total_target,
            total_saved=total_saved,
            overall_progress=overall_progress
        )

    @staticmethod
    def get_active_goals(db: Session, user_id: int) -> List[Goal]:
        """Get goals that are not yet completed"""
        return db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.current_amount < Goal.target_amount
        ).order_by(Goal.deadline.asc().nullslast()).all()

    @staticmethod
    def get_completed_goals(db: Session, user_id: int) -> List[Goal]:
        """Get goals that are completed"""
        return db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.current_amount >= Goal.target_amount
        ).order_by(Goal.updated_at.desc()).all()

    @staticmethod
    def get_overdue_goals(db: Session, user_id: int) -> List[Goal]:
        """Get goals that are past their deadline and not completed"""
        today = date.today()
        return db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.deadline.isnot(None),
            Goal.deadline < today,
            Goal.current_amount < Goal.target_amount
        ).order_by(Goal.deadline.desc()).all()
