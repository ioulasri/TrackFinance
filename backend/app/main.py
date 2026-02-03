from fastapi import FastAPI
from app.api.routes import users, transactions, achievement, budget
from app.db.session import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Financial Quest API",
    description="Gamified personal finance tracking",
    version="1.0.0"
)

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