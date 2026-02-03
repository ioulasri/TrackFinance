from datetime import datetime, timezone

INITIAL_ACHIEVEMENTS = [
    {
        "name": "First Step",
        "description": "Record your first transaction",
        "icon": "🎯",
        "xp_reward": 50,
        "category": "getting_started",
        "requirement_type": "transaction_count",
        "requirement_value": 1
    },
    {
        "name": "Budget Beginner",
        "description": "Create your first budget",
        "icon": "📊",
        "xp_reward": 100,
        "category": "getting_started",
        "requirement_type": "budget_count",
        "requirement_value": 1
    },
    {
        "name": "Week Warrior",
        "description": "Track expenses for 7 consecutive days",
        "icon": "📅",
        "xp_reward": 150,
        "category": "consistency",
        "requirement_type": "daily_streak",
        "requirement_value": 7
    },

    # Consistency & Habits
    {
        "name": "Consistency King",
        "description": "Maintain a 30-day tracking streak",
        "icon": "👑",
        "xp_reward": 500,
        "category": "consistency",
        "requirement_type": "daily_streak",
        "requirement_value": 30
    },
    {
        "name": "Century Club",
        "description": "Track 100 transactions",
        "icon": "💯",
        "xp_reward": 300,
        "category": "milestone",
        "requirement_type": "transaction_count",
        "requirement_value": 100
    },
    {
        "name": "Dedicated Tracker",
        "description": "Maintain a 60-day tracking streak",
        "icon": "🔥",
        "xp_reward": 1000,
        "category": "consistency",
        "requirement_type": "daily_streak",
        "requirement_value": 60
    },

    # Budget Management
    {
        "name": "Budget Master",
        "description": "Stay under budget in all categories for a month",
        "icon": "🎓",
        "xp_reward": 750,
        "category": "budget",
        "requirement_type": "budget_success_month",
        "requirement_value": 1
    },
    {
        "name": "Frugal Hero",
        "description": "Spend 20% less than budgeted in a month",
        "icon": "🦸",
        "xp_reward": 500,
        "category": "budget",
        "requirement_type": "under_budget_percent",
        "requirement_value": 20
    },
    {
        "name": "Category Champion",
        "description": "Create budgets for 5 different categories",
        "icon": "🏆",
        "xp_reward": 200,
        "category": "budget",
        "requirement_type": "budget_count",
        "requirement_value": 5
    },

    # Savings & Income
    {
        "name": "Saver Starter",
        "description": "Record 10 income transactions",
        "icon": "💰",
        "xp_reward": 200,
        "category": "income",
        "requirement_type": "income_count",
        "requirement_value": 10
    },
    {
        "name": "Money Maker",
        "description": "Earn more than you spend in a month",
        "icon": "📈",
        "xp_reward": 600,
        "category": "financial_health",
        "requirement_type": "positive_month",
        "requirement_value": 1
    },

    # Special Milestones
    {
        "name": "Detail Oriented",
        "description": "Add descriptions to 50 transactions",
        "icon": "📝",
        "xp_reward": 250,
        "category": "milestone",
        "requirement_type": "described_transactions",
        "requirement_value": 50
    },
    {
        "name": "Early Bird",
        "description": "Log a transaction before 8 AM",
        "icon": "🌅",
        "xp_reward": 100,
        "category": "special",
        "requirement_type": "early_transaction",
        "requirement_value": 1
    },
    {
        "name": "Night Owl",
        "description": "Log a transaction after 10 PM",
        "icon": "🦉",
        "xp_reward": 100,
        "category": "special",
        "requirement_type": "late_transaction",
        "requirement_value": 1
    },
    {
        "name": "Financial Veteran",
        "description": "Use the app for 3 months",
        "icon": "⭐",
        "xp_reward": 1500,
        "category": "milestone",
        "requirement_type": "account_age_days",
        "requirement_value": 90
    }
]