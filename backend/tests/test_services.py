import pytest
from app.services.xp_service import XPService
from app.services.user_service import UserService
from app.schemas.user import UserCreate


@pytest.mark.unit
class TestXPService:
    """Test XP service calculations."""

    def test_get_xp_for_level_1(self):
        """Test XP required for level 1."""
        xp = XPService.get_xp_for_next_level(1)
        assert xp == 400  # (1+1)^2 * 100 = 400

    def test_get_xp_for_level_5(self):
        """Test XP required for level 5."""
        xp = XPService.get_xp_for_next_level(5)
        assert xp > 100

    def test_calculate_level_from_xp(self):
        """Test level calculation from XP."""
        level = XPService.calculate_level(250)
        assert level >= 1

    def test_award_xp(self, db_session, test_user):
        """Test awarding XP to user."""
        initial_xp = test_user.total_xp
        XPService.award_xp(db_session, test_user.id, 100)
        db_session.refresh(test_user)
        assert test_user.total_xp == initial_xp + 100


@pytest.mark.unit
class TestUserService:
    """Test user service."""

    def test_create_user(self, db_session):
        """Test creating a new user."""
        user_data = UserCreate(
            email="newuser@test.com",
            username="newuser",
            password="password123"
        )
        user = UserService.create_user(db_session, user_data)
        assert user.email == "newuser@test.com"
        assert user.username == "newuser"
        assert user.hashed_password != "password123"  # Should be hashed

    def test_authenticate_user_success(self, db_session, test_user):
        """Test successful user authentication."""
        user = UserService.authenticate_user(db_session, "testuser", "password123")
        assert user is not None
        assert user.username == "testuser"

    def test_authenticate_user_wrong_password(self, db_session, test_user):
        """Test authentication with wrong password."""
        user = UserService.authenticate_user(db_session, "testuser", "wrongpass")
        assert user is None

    def test_authenticate_nonexistent_user(self, db_session):
        """Test authentication with non-existent user."""
        user = UserService.authenticate_user(db_session, "nonexistent", "password")
        assert user is None
