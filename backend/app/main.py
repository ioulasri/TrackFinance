from fastapi import FastAPI
from app.api.routes import users, transactions, achievement, budget
from app.db.session import engine, Base
import os

app = FastAPI(
    title="Financial Quest API",
    description="Gamified personal finance tracking",
    version="1.0.0"
)

# Create database tables only if not in testing mode
if os.getenv("TESTING") != "1":
    Base.metadata.create_all(bind=engine)

app.include_router(users.router)
app.include_router(transactions.router)
app.include_router(achievement.router)
app.include_router(budget.router)

@app.get("/")
def root():
    return {
        "message": "Welcome to Financial Quest API",
        "docs": "/docs",
        "version": "1.0.0"
    }