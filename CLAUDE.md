# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrackFinance is a gamified personal finance tracker. Users earn XP, level up, and unlock achievements by recording transactions, setting budgets, and hitting savings goals. The currency throughout is **MAD (Moroccan Dirham)**. The production domain is `expensehub.site`.

## Commands

### Docker (recommended for full-stack dev)
```bash
make docker-up          # Start all services (frontend :3000, backend :8000, postgres :5432)
make docker-down        # Stop all services
make docker-build       # Rebuild and restart
make docker-logs        # Tail logs for all services
make docker-clean       # Stop and remove volumes (full reset)
make seed               # Seed achievement definitions into the running DB
```

### Backend (local)
```bash
# From repo root — uses uv + .venv
source .venv/bin/activate
cd backend

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Migrations
alembic upgrade head
alembic revision --autogenerate -m "description"

# Seed achievements (run once after a fresh DB)
python -m app.scripts.seed_achievements

# Tests
pytest                        # run all
pytest tests/test_users.py    # single file
pytest -k "test_create_user"  # single test
pytest --cov=app tests/        # with coverage

# Linting
black app/
flake8 backend/
```

### Frontend (local)
```bash
cd frontend
npm install
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # Production build to dist/
```

## Architecture

### Backend (`backend/app/`)

The backend is a **FastAPI** app (`app/main.py`) that registers six routers under `/v1/`:
- `users` — auth (register, login, JWT, email verification, Google/Discord OAuth, avatar upload)
- `transactions` — CRUD with soft-delete (`is_deleted` flag)
- `budgets` — per-category monthly limits; `current_spent` is updated on every transaction write
- `goals` — savings goals with `current_amount` progress
- `achievement` — unlock system backed by `AchievementChecker`
- `chat` — AI assistant (Groq), `reports` — PDF export (ReportLab)

**Layer structure** for each feature:
```
routes/ → services/ → models/ (SQLAlchemy) + schemas/ (Pydantic)
```
Routes only call service classes; services own all business logic and DB mutations.

**XP & gamification** (`services/xp_service.py`):
- Level formula: `level = floor(sqrt(total_xp / 100))`
- `XPService.award_xp()` also updates `current_streak` and `longest_streak` based on `last_activity_date`
- `AchievementChecker` is called from transaction/budget/goal routes after every successful write; it queries `AchievementService.check_achievement_requirements()` then calls `check_and_unlock_achievement()` for each eligible achievement

**Auth flow**: JWT tokens (30-min TTL) signed with `SECRET_KEY`. The dependency `get_current_user` (`api/dependencies.py`) decodes the token and injects the `User` ORM object. OAuth (Google, Discord) exchanges the code for a token and redirects to `{FRONTEND_URL}/oauth-callback?token=<jwt>`.

**AI chat** (`services/chat_service.py`): Uses Groq (`llama-3.1-8b-instant`) with function calling. The service defines `TOOLS` (read + write for transactions/budgets/goals) and dispatches calls through `_handle_tool_call()`. Requires `GROQ_API_KEY` env var.

**Testing**: `conftest.py` overrides `get_db` with an in-memory SQLite session. Set `TESTING=1` to prevent `Base.metadata.create_all` from running at import time. Fixtures: `db_session`, `client`, `test_user`, `test_user_token`, `auth_headers`.

### Frontend (`frontend/`)

Entry point: `frontend/main.tsx` → `frontend/app/App.tsx`.

`App.tsx` manages a top-level `authState` FSM (`landing → login/register → authenticated`) and conditionally renders either auth screens or the main layout (Sidebar + routed pages). The OAuth callback is handled inline in the `useEffect` on mount.

**`@` alias** resolves to `frontend/app/` (configured in `vite.config.ts`).

All API calls go through `frontend/app/api/index.ts`, which exports named objects per domain (`authAPI`, `transactionAPI`, `budgetAPI`, `goalAPI`, `achievementAPI`, `analysisAPI`, `chatAPI`, `reportAPI`). The axios instance auto-attaches the JWT from `localStorage` via a request interceptor. In production on DigitalOcean, the API URL is inferred by replacing `frontend` with `backend` in the hostname; override with `VITE_API_URL`.

Pages live in `frontend/src/pages/`; page-level and shared UI components live in `frontend/app/components/`. The `AIAssistant` component floats over all authenticated pages.

### Database

PostgreSQL in production, SQLite (in-memory) for tests. Alembic manages schema migrations (`backend/alembic/`). The Docker postgres container bootstraps with `backend/migrations/001_initial_schema.sql`.

**Do not** call `Base.metadata.create_all()` in application startup — Alembic is the sole schema authority.

Key model relationships:
- `User` → `Transaction`, `Budget`, `Goal` (cascade delete)
- `User` ↔ `Achievement` via `UserAchievement` junction table

### Environment Variables

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `SECRET_KEY` | Backend | JWT signing |
| `FRONTEND_URL` | Backend | OAuth redirect target |
| `BACKEND_URL` | Backend | Used in OAuth redirect construction |
| `GROQ_API_KEY` | Backend | AI chat feature |
| `GOOGLE_CLIENT_ID/SECRET` | Backend | Google OAuth |
| `DISCORD_CLIENT_ID/SECRET` | Backend | Discord OAuth |
| `VITE_API_URL` | Frontend | Override API base URL |
| `ALLOWED_ORIGINS` | Backend | CORS; `*` when `ENVIRONMENT=production` |

Backend reads `.env` from `backend/.env` (loaded by Docker via `env_file`).
