# TrackFinance - Financial Quest API

A gamified personal finance tracking application that makes managing your money fun and engaging through achievements, XP, and level progression.

## 🎮 Features

### Core Functionality
- **Transaction Tracking**: Record income and expenses with categories and descriptions
- **Budget Management**: Set monthly spending limits per category with real-time tracking
- **Achievement System**: Unlock achievements by hitting financial milestones
- **Gamification**: Earn XP, level up, and maintain streaks for consistent tracking
- **User Authentication**: Secure JWT-based authentication system

### Gamification Elements
- 🎯 **XP & Leveling**: Gain experience points and level up as you use the app
- 🏆 **Achievements**: 10+ unlockable achievements across multiple categories
- 🔥 **Streaks**: Track daily activity streaks (current and longest)
- 📊 **Progress Tracking**: Monitor your financial goals and achievements

## 🛠 Tech Stack

- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Authentication**: JWT tokens with bcrypt password hashing
- **Containerization**: Docker & Docker Compose

## 📁 Project Structure

```
TrackFinance/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies.py       # Auth dependencies
│   │   │   └── routes/               # API endpoints
│   │   │       ├── users.py          # User auth & profile
│   │   │       ├── transactions.py   # Transaction CRUD
│   │   │       ├── budget.py         # Budget management
│   │   │       └── achievement.py    # Achievement system
│   │   ├── core/
│   │   │   └── security.py           # JWT & password hashing
│   │   ├── db/
│   │   │   ├── config.py             # Database configuration
│   │   │   └── session.py            # Database session
│   │   ├── models/                   # SQLAlchemy models
│   │   ├── schemas/                  # Pydantic schemas
│   │   ├── services/                 # Business logic
│   │   │   ├── user_service.py
│   │   │   ├── transaction_service.py
│   │   │   ├── budget_service.py
│   │   │   ├── achievement_services.py
│   │   │   ├── achievement_checker.py
│   │   │   └── xp_service.py
│   │   └── data/
│   │       └── initial_achievements.py
│   ├── alembic/                      # Database migrations
│   └── migrations/                   # SQL migration scripts
├── docker/
│   └── backend.dockerfile
└── docker-compose.yaml
```

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.12+ (for local development)

### Quick Start with Docker

1. **Clone the repository**
```bash
git clone https://github.com/ioulasri/TrackFinance.git
cd TrackFinance
```

2. **Start the application**
```bash
docker-compose up -d
```

3. **Access the API**
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- Database: localhost:5432

### Local Development Setup

1. **Create virtual environment**
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. **Install dependencies**
```bash
cd backend
pip install -r requirements.txt
```

3. **Set environment variables**
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trackfinance"
export SECRET_KEY="your-secret-key"
```

4. **Run migrations**
```bash
alembic upgrade head
```

5. **Seed achievements**
```bash
python -m app.scripts.seed_achievements
```

6. **Start the server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/v1/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

#### Login
```http
POST /api/v1/users/login
Content-Type: application/json

{
  "username": "username",
  "password": "password123"
}
```

### Transactions

#### Create Transaction
```http
POST /api/v1/transactions/
Authorization: Bearer <token>

{
  "amount": 50.00,
  "category": "groceries",
  "type": "expense",
  "description": "Weekly shopping",
  "date": "2026-02-03T10:00:00Z"
}
```

#### List Transactions
```http
GET /api/v1/transactions/?skip=0&limit=10
Authorization: Bearer <token>
```

### Budgets

#### Create Budget
```http
POST /api/v1/budgets/
Authorization: Bearer <token>

{
  "category": "groceries",
  "monthly_limit": 500.00
}
```

#### Get Budget Status
```http
GET /api/v1/budgets/status
Authorization: Bearer <token>
```

#### Reset Monthly Budgets
```http
POST /api/v1/budgets/reset-monthly
Authorization: Bearer <token>
```

### Achievements

#### List All Achievements
```http
GET /api/v1/achievements/
```

#### Get User Achievements
```http
GET /api/v1/achievements/me
Authorization: Bearer <token>
```

#### Get Achievement Stats
```http
GET /api/v1/achievements/me/stats
Authorization: Bearer <token>
```

### User Profile

#### Get Current User
```http
GET /api/v1/users/me
Authorization: Bearer <token>
```

#### Get User Stats
```http
GET /api/v1/users/me/stats
Authorization: Bearer <token>
```

## 🏆 Achievement Categories

### Getting Started
- **First Step**: Record your first transaction (50 XP)
- **Budget Beginner**: Create your first budget (100 XP)

### Consistency
- **Week Warrior**: 7-day tracking streak (150 XP)
- **Consistency King**: 30-day tracking streak (500 XP)

### Milestones
- **Century Club**: Track 100 transactions (300 XP)

### Budget Mastery
- Achievements for creating and maintaining budgets

## 🗄 Database Schema

### Users
- Email, username, hashed password
- XP tracking (total_xp, current_level)
- Streak tracking (current_streak, longest_streak)
- Activity timestamps

### Transactions
- User-linked income/expense records
- Amount, category, type, description
- Soft delete support
- Indexed for performance

### Budgets
- Per-category monthly limits
- Current spent tracking
- Automatic reset functionality
- Unique constraint per user-category

### Achievements
- Name, description, icon
- XP rewards
- Requirement types and values
- Category-based organization

### UserAchievements
- Junction table for unlocked achievements
- Tracks unlock timestamps

## 🔐 Security

- Passwords hashed with bcrypt
- JWT token-based authentication
- 30-minute token expiration
- Environment-based secret keys
- SQL injection prevention via SQLAlchemy ORM

## 🧪 Testing

```bash
# Run tests (when implemented)
pytest

# Check code quality
flake8 backend/
```

## 🚧 Roadmap

- [ ] Implement streak update logic for daily activity
- [ ] Add analytics endpoints (spending trends, charts)
- [ ] Implement notification system for achievements
- [ ] Add recurring transaction support
- [ ] Build frontend (React/Vue)
- [ ] Mobile app development
- [ ] Export data functionality
- [ ] Multi-currency support
- [ ] Budget alerts and warnings
- [ ] Social features (leaderboards, challenges)

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@postgres:5432/trackfinance` |
| `SECRET_KEY` | JWT signing key | `dev-secret-key-change-in-production` |
| `API_HOST` | Server host | `0.0.0.0` |
| `API_PORT` | Server port | `8000` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ by imad OULASRI

---

**Note**: This is a backend API. Frontend implementation is required for a complete user experience.
