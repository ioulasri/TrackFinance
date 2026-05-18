from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import users, transactions, achievement, budget, goals, chat, reports, telegram
from app.db.session import engine, Base
import os

app = FastAPI(
    title="Financial Quest API",
    description="Gamified personal finance tracking",
    version="1.0.0"
)

# Configure CORS
# Allow all origins in production (DigitalOcean domains are dynamic)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if os.getenv("ENVIRONMENT") == "production" else allowed_origins,
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

@app.get("/")
def root():
    return {
        "message": "Welcome to Financial Quest API",
        "docs": "/docs",
        "version": "1.0.0"
    }