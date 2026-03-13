import pytest
from fastapi import status
from app.services.oauth_service import OAuthService


@pytest.mark.auth
class TestUserRegistration:
    """Test user registration endpoints."""

    def test_register_user_success(self, client):
        """Test successful user registration."""
        response = client.post(
            "/api/v1/users/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "password123"
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["username"] == "newuser"
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client, test_user):
        """Test registration with duplicate email fails."""
        response = client.post(
            "/api/v1/users/register",
            json={
                "email": test_user.email,
                "username": "different",
                "password": "password123"
            }
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_duplicate_username(self, client, test_user):
        """Test registration with duplicate username fails."""
        response = client.post(
            "/api/v1/users/register",
            json={
                "email": "different@example.com",
                "username": test_user.username,
                "password": "password123"
            }
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.auth
class TestUserLogin:
    """Test user login endpoints."""

    def test_login_success(self, client, test_user):
        """Test successful login."""
        response = client.post(
            "/api/v1/users/login",
            json={
                "username": "testuser",
                "password": "password123"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        """Test login with wrong password."""
        response = client.post(
            "/api/v1/users/login",
            json={
                "username": "testuser",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        response = client.post(
            "/api/v1/users/login",
            json={
                "username": "nonexistent",
                "password": "password123"
            }
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.auth
class TestUserProfile:
    """Test user profile endpoints."""

    def test_get_current_user(self, client, test_user, auth_headers):
        """Test getting current user profile."""
        response = client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username

    def test_get_current_user_unauthorized(self, client):
        """Test getting user profile without auth."""
        response = client.get("/api/v1/users/me")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_user_stats(self, client, test_user, auth_headers):
        """Test getting user stats."""
        response = client.get("/api/v1/users/me/stats", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["user_id"] == test_user.id
        assert "total_xp" in data
        assert "current_level" in data
        assert "current_streak" in data
        assert "xp_to_next_level" in data
        assert "level_progress_percentage" in data


@pytest.mark.auth
class TestOAuthRoutes:
    """Test OAuth redirect endpoints."""

    def test_google_oauth_route_exists(self, client):
        """Google sign-in should redirect to Google's consent screen."""
        response = client.get("/v1/users/oauth/google", follow_redirects=False)

        assert response.status_code == status.HTTP_307_TEMPORARY_REDIRECT
        assert response.headers["location"].startswith("https://accounts.google.com/")

    def test_google_oauth_redirect_uses_live_callback_route(self):
        """OAuth config should point back to the actual FastAPI callback route."""
        auth_url = OAuthService.get_google_auth_url()

        assert "redirect_uri=" in auth_url
        assert "%2Fv1%2Fusers%2Foauth%2Fgoogle%2Fcallback" in auth_url
        assert "%2Fapi%2Fv1%2Fusers%2Foauth%2Fgoogle%2Fcallback" not in auth_url
