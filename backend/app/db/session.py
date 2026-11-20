from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.db.config import settings
import os

# Supabase's transaction pooler owns connection pooling on Vercel. Avoid
# multiplying idle application pools across serverless function instances.
pool_options = {"poolclass": NullPool} if os.getenv("VERCEL") else {"pool_size": 5, "max_overflow": 10}
engine = create_engine(settings.database_url, pool_pre_ping=True, echo=settings.debug, **pool_options)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
