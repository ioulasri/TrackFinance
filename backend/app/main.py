from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import users, transactions, achievement, budget, goals, chat, reports, telegram, recurring, jobs, receipts
from app.db.session import engine, Base
from app.services import scheduler_service
import os

app = FastAPI(
    title="Financial Quest API",
    description="Gamified personal finance tracking",
    version="1.0.0"
)

# Use exact frontend origins, including the custom domain when configured.
allowed_origins = [origin.strip().rstrip("/") for origin in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
).split(",") if origin.strip()]
if "*" in allowed_origins:
    raise RuntimeError("ALLOWED_ORIGINS must list exact frontend origins.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables only if not in testing mode
# Disabled for production - use Alembic migrations instead
# if os.getenv("TESTING") != "1":
#     Base.metadata.create_all(bind=engine)

app.include_router(users.router)
app.include_router(transactions.router)
app.include_router(achievement.router)
app.include_router(budget.router)
app.include_router(goals.router)
app.include_router(chat.router)
app.include_router(reports.router)
app.include_router(telegram.router)
app.include_router(recurring.router)
app.include_router(jobs.router)
app.include_router(receipts.router)


@app.on_event("startup")
def _start_background_scheduler() -> None:
    scheduler_service.start_scheduler()


@app.on_event("shutdown")
def _stop_background_scheduler() -> None:
    scheduler_service.stop_scheduler()


@app.get("/")
def root():
    return {
        "message": "Welcome to Financial Quest API",
        "docs": "/docs",
        "version": "1.0.0"
    }
