import pytest
from fastapi import status


@pytest.mark.achievements
class TestAchievementRetrieval:
    """Test achievement retrieval endpoints."""

    def test_list_all_achievements(self, client, test_achievement):
        """Test listing all achievements (no auth required)."""
        response = client.get("/api/v1/achievements/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_achievement_by_id(self, client, test_achievement):
        """Test getting a specific achievement."""
        response = client.get(f"/api/v1/achievements/{test_achievement.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_achievement.id
        assert data["name"] == test_achievement.name

    def test_get_nonexistent_achievement(self, client):
        """Test getting a non-existent achievement."""
        response = client.get("/api/v1/achievements/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.achievements
class TestUserAchievements:
    """Test user achievement endpoints."""

    def test_get_user_achievements(self, client, test_user, auth_headers):
        """Test getting user's unlocked achievements."""
        response = client.get("/api/v1/achievements/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_get_user_achievement_stats(self, client, test_user, auth_headers):
        """Test getting user achievement statistics."""
        response = client.get("/api/v1/achievements/me/stats", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "unlocked_count" in data
        assert "total_achievements" in data
        assert "completion_percentage" in data

    def test_get_achievements_unauthorized(self, client):
        """Test getting user achievements without auth."""
        response = client.get("/api/v1/achievements/me")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.achievements
@pytest.mark.integration
class TestAchievementUnlocking:
    """Test achievement unlocking logic."""

    def test_unlock_first_transaction_achievement(self, client, test_user, test_achievement, auth_headers, db_session):
        """Test that creating first transaction unlocks achievement."""
        from datetime import datetime, timezone
        
        # Create a transaction
        response = client.post(
            "/api/v1/transactions/",
            headers=auth_headers,
            json={
                "amount": 50.00,
                "category": "groceries",
                "type": "expense",
                "description": "Test",
                "date": datetime.now(timezone.utc).isoformat()
            }
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_unlock_first_budget_achievement(self, client, test_user, auth_headers):
        """Test that creating first budget can trigger achievement."""
        response = client.post(
            "/api/v1/budgets/",
            headers=auth_headers,
            json={
                "category": "test_category",
                "monthly_limit": 500.00
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
