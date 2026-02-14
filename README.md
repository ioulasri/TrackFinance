# TrackFinance 💰✨

A gamified personal finance tracking application that makes managing your money fun and engaging through achievements, XP, and level progression. Built with a modern React frontend and powerful FastAPI backend.

## 🎮 Features

### Core Functionality
- **Transaction Tracking**: Record income and expenses with categories and descriptions
- **Budget Management**: Set monthly spending limits per category with real-time tracking
- **Financial Goals**: Create and track progress towards savings goals with target amounts and deadlines
- **Achievement System**: Unlock achievements by hitting financial milestones
- **Gamification**: Earn XP, level up, and maintain streaks for consistent tracking
- **User Authentication**: Secure JWT-based authentication system
- **Interactive Dashboard**: Visualize your finances with charts and analytics

### Gamification Elements
- 🎯 **XP & Leveling**: Gain experience points and level up as you use the app
- 🏆 **Achievements**: 10+ unlockable achievements across multiple categories
- 🔥 **Streaks**: Track daily activity streaks (current and longest)
- 📊 **Progress Tracking**: Monitor your financial goals and achievements
- 🎨 **Beautiful UI**: Clean, modern interface with gamified elements

## 📱 Application Pages

- **Dashboard**: Overview of finances with charts, balance cards, and spending insights
- **Transactions**: List, create, and manage income/expense transactions
- **Budgets**: Set category limits and track spending progress
- **Goals**: Create savings goals and track progress towards targets
- **Achievements**: View unlocked achievements and track your progress
- **Profile**: View user stats, XP, level, and streaks

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **Icons**: Lucide React, Material UI Icons
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Routing**: React Router

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Authentication**: JWT tokens with bcrypt password hashing

### DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (frontend production)

## 📁 Project Structure

```
TrackFinance/
├── frontend/                      # React + Vite + TypeScript frontend
│   ├── app/
│   │   ├── App.tsx               # Main application component
│   │   ├── api/                  # API client and service layer
│   │   └── components/           # Reusable React components
│   ├── src/
│   │   └── pages/                # Page components (Dashboard, Budgets, etc.)
│   ├── styles/                   # CSS and styling files
│   ├── public/                   # Static assets
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies.py   # Auth dependencies
│   │   │   └── routes/           # API endpoints
│   │   │       ├── users.py      # User auth & profile
│   │   │       ├── transactions.py # Transaction CRUD
│   │   │       ├── budget.py     # Budget management
│   │   │       ├── goals.py      # Financial goals
│   │   │       └── achievement.py # Achievement system
│   │   ├── core/
│   │   │   └── security.py       # JWT & password hashing
│   │   ├── db/
│   │   │   ├── config.py         # Database configuration
│   │   │   └── session.py        # Database session
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Business logic
│   │   │   ├── user_service.py
│   │   │   ├── transaction_service.py
│   │   │   ├── budget_service.py
│   │   │   ├── goal_service.py
│   │   │   ├── achievement_services.py
│   │   │   ├── achievement_checker.py
│   │   │   └── xp_service.py
│   │   ├── data/
│   │   │   └── initial_achievements.py
│   │   └── scripts/
│   │       └── seed_achievements.py
│   ├── alembic/                  # Database migrations
│   ├── migrations/               # SQL migration scripts
│   ├── tests/                    # Test suite
│   └── requirements.txt
├── docker/
│   ├── backend.dockerfile
│   ├── frontend.dockerfile
│   └── nginx.conf                # Nginx configuration for frontend
└── docker-compose.yaml           # Multi-container orchestration
```

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ & npm (for local frontend development)
- Python 3.12+ (for local backend development)

### Quick Start with Docker (Recommended)

1. **Clone the repository**
```bash
git clone https://github.com/ioulasri/TrackFinance.git
cd TrackFinance
```

2. **Start all services**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- FastAPI backend on port 8000
- React frontend on port 3000

3. **Access the application**
- Frontend UI: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Database: localhost:5432

### Local Development Setup

#### Backend

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

6. **Start the backend server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Start the development server**
```bash
npm run dev
```

The frontend will be available at http://localhost:5173 (Vite default port)

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

#### List Budgets
```http
GET /api/v1/budgets/
Authorization: Bearer <token>
```

#### Get Budget Status
```http
GET /api/v1/budgets/status
Authorization: Bearer <token>
```

#### Delete Budget
```http
DELETE /api/v1/budgets/{id}
Authorization: Bearer <token>
```

#### Reset Monthly Budgets
```http
POST /api/v1/budgets/reset-monthly
Authorization: Bearer <token>
```

### Goals

#### Create Goal
```http
POST /api/v1/goals/
Authorization: Bearer <token>

{
  "name": "Emergency Fund",
  "target_amount": 10000.00,
  "current_amount": 0.00,
  "deadline": "2026-12-31",
  "description": "Build 6-month emergency fund"
}
```

#### List Goals
```http
GET /api/v1/goals/
Authorization: Bearer <token>
```

#### Update Goal Progress
```http
PUT /api/v1/goals/{id}
Authorization: Bearer <token>

{
  "current_amount": 2500.00
}
```

#### Delete Goal
```http
DELETE /api/v1/goals/{id}
Authorization: Bearer <token>
```

#### Get Goal Statistics
```http
GET /api/v1/goals/stats
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
- **Goal Setter**: Create your first financial goal (75 XP)

### Consistency
- **Week Warrior**: 7-day tracking streak (150 XP)
- **Consistency King**: 30-day tracking streak (500 XP)

### Milestones
- **Century Club**: Track 100 transactions (300 XP)
- **Savings Champion**: Reach a goal target amount (400 XP)

### Budget Mastery
- **Budget Master**: Stay within budget for a full month (250 XP)
- **Financial Planner**: Create 5 budgets (200 XP)

> 💰 **Currency**: The application uses MAD (Moroccan Dirham) as the default currency

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

### Goals
- Savings goals with target amounts
- Progress tracking (current_amount)
- Deadline management
- Description and metadata
- User-linked with cascade delete

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
# Run backend tests
cd backend
pytest

# Run with coverage
pytest --cov=app tests/

# Check code quality
flake8 backend/
```

## 🚧 Roadmap

### ✅ Completed
- [x] User authentication and profile management
- [x] Transaction tracking (income/expense)
- [x] Budget management with progress tracking
- [x] Financial goals with deadline tracking
- [x] Achievement system with auto-unlock
- [x] XP and leveling system
- [x] React frontend with responsive design
- [x] Interactive dashboard with charts
- [x] Docker deployment setup

### 🔄 In Progress
- [ ] Streak update logic for daily activity tracking
- [ ] Real-time notifications for achievements
- [ ] Enhanced analytics and spending trends

### 📋 Planned Features
- [ ] Budget alerts and warnings
- [ ] Recurring transaction support
- [ ] Export data functionality (CSV, PDF)
- [ ] Multi-currency support
- [ ] Mobile app (React Native)
- [ ] Social features (leaderboards, challenges)
- [ ] Smart budget recommendations based on spending patterns
- [ ] Bank integration (Read-only account linking)
- [ ] Bill reminders and payment tracking
- [ ] Investment portfolio tracking

## 📝 Environment Variables

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@postgres:5432/trackfinance` |
| `SECRET_KEY` | JWT signing key | `dev-secret-key-change-in-production` |
| `API_HOST` | Server host | `0.0.0.0` |
| `API_PORT` | Server port | `8000` |

### Frontend
The frontend proxies API requests to the backend service. In Docker, it uses the backend service name. For local development, configure the API base URL in your environment.

## 🎨 UI Features

- **Clean Design**: Modern, minimalist interface with white cards on gray backgrounds
- **Color-Coded Budgets**: Visual progress indicators (green, blue, orange, red)
- **Interactive Charts**: Recharts-powered visualizations for spending analysis
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode Ready**: Theme system built with Tailwind CSS
- **Icon Library**: Lucide React icons throughout the interface

## 📖 Additional Documentation

- [Deployment Guide](DEPLOYMENT.md) - DigitalOcean deployment instructions
- [Docker Guide](DOCKER.md) - Docker configuration and troubleshooting
- [Project Status](PROJECT_STATUS.md) - Detailed feature implementation status
- [Workflow Guide](WORKFLOW.md) - Development workflow and best practices

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View backend logs
docker-compose logs backend

# Restart database
docker-compose restart postgres
```

### Frontend Not Loading
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### API Connection Failed
- Ensure backend is running on port 8000
- Check CORS settings in backend configuration
- Verify API URL in frontend environment variables

## 🛠 Useful Commands

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs for all services
docker-compose logs -f

# Rebuild and restart a specific service
docker-compose up -d --build backend

# Remove all containers and volumes (fresh start)
docker-compose down -v
```

### Database Commands
```bash
# Access PostgreSQL shell
docker exec -it financetracking-db psql -U postgres -d trackfinance

# Run migrations
cd backend && alembic upgrade head

# Create new migration
cd backend && alembic revision --autogenerate -m "description"
```

### Backend Commands
```bash
# Run tests
cd backend && pytest

# Seed achievements
cd backend && python -m app.scripts.seed_achievements

# Format code
cd backend && black app/
```

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

**Ready to track your finances gamified style?** 🚀 Get started with Docker in under 2 minutes!
