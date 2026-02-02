from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db.session import Base, engine, get_db
from app.models.user import User

app = FastAPI()

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/users/")
def create_user(email: str, name: str | None = None, db: Session = Depends(get_db)):
    user = User(email=email, name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.get("/users/")
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
