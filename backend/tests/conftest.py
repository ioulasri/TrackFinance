import pytest
import os

# Set testing environment variable before importing app
os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import Base, get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.achievement import Achievement
from app.models.user_achievement import UserAchievement
from app.core.security import hash_password, create_access_token


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=hash_password("password123"),
        total_xp=0,
        current_level=1,
        current_streak=0,
        longest_streak=0
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_user_token(test_user):
    """Create an access token for the test user."""
    return create_access_token(data={"sub": test_user.username})


@pytest.fixture
def auth_headers(test_user_token):
    """Create authorization headers."""
    return {"Authorization": f"Bearer {test_user_token}"}


@pytest.fixture
def test_achievement(db_session):
    """Create a test achievement."""
    achievement = Achievement(
        name="Test Achievement",
        description="A test achievement",
        icon="🎯",
        xp_reward=100,
        category="test",
        requirement_type="transaction_count",
        requirement_value=1
    )
    db_session.add(achievement)
    db_session.commit()
    db_session.refresh(achievement)
    return achievement


@pytest.fixture
def test_transaction(db_session, test_user):
    """Create a test transaction."""
    from datetime import datetime, timezone
    transaction = Transaction(
        user_id=test_user.id,
        amount=50.00,
        category="groceries",
        type="expense",
        description="Test transaction",
        date=datetime.now(timezone.utc),
        is_deleted=False
    )
    db_session.add(transaction)
    db_session.commit()
    db_session.refresh(transaction)
    return transaction


@pytest.fixture
def test_budget(db_session, test_user):
    """Create a test budget."""
    from datetime import datetime, timezone
    budget = Budget(
        user_id=test_user.id,
        category="groceries",
        monthly_limit=500.00,
        current_spent=0.00,
        last_reset_date=datetime.now(timezone.utc)
    )
    db_session.add(budget)
    db_session.commit()
    db_session.refresh(budget)
    return budget
