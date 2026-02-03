import pytest
from fastapi import status


@pytest.mark.budgets
class TestBudgetCreation:
    """Test budget creation endpoints."""

    def test_create_budget(self, client, test_user, auth_headers):
        """Test creating a budget."""
        response = client.post(
            "/api/v1/budgets/",
            headers=auth_headers,
            json={
                "category": "entertainment",
                "monthly_limit": 200.00
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["category"] == "entertainment"
        assert data["monthly_limit"] == 200.0
        assert data["current_spent"] == 0.0

    def test_create_duplicate_budget(self, client, test_budget, auth_headers):
        """Test creating a duplicate budget for same category fails."""
        response = client.post(
            "/api/v1/budgets/",
            headers=auth_headers,
            json={
                "category": test_budget.category,
                "monthly_limit": 300.00
            }
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_budget_unauthorized(self, client):
        """Test creating budget without auth."""
        response = client.post(
            "/api/v1/budgets/",
            json={
                "category": "groceries",
                "monthly_limit": 500.00
            }
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.budgets
class TestBudgetRetrieval:
    """Test budget retrieval endpoints."""

    def test_list_budgets(self, client, test_budget, auth_headers):
        """Test listing user budgets."""
        response = client.get("/api/v1/budgets/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_budget_by_id(self, client, test_budget, auth_headers):
        """Test getting a specific budget."""
        response = client.get(
            f"/api/v1/budgets/{test_budget.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_budget.id
        assert data["category"] == test_budget.category

    def test_get_budget_status(self, client, test_budget, auth_headers):
        """Test getting budget status."""
        response = client.get("/api/v1/budgets/status", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, dict)
        assert "budgets" in data

    def test_get_nonexistent_budget(self, client, auth_headers):
        """Test getting a non-existent budget."""
        response = client.get("/api/v1/budgets/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.budgets
class TestBudgetUpdate:
    """Test budget update endpoints."""

    def test_update_budget(self, client, test_budget, auth_headers):
        """Test updating a budget."""
        response = client.patch(
            f"/api/v1/budgets/{test_budget.id}",
            headers=auth_headers,
            json={
                "monthly_limit": 600.00
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["monthly_limit"] == 600.0

    def test_update_nonexistent_budget(self, client, auth_headers):
        """Test updating a non-existent budget."""
        response = client.patch(
            "/api/v1/budgets/99999",
            headers=auth_headers,
            json={"monthly_limit": 700.00}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.budgets
class TestBudgetDeletion:
    """Test budget deletion endpoints."""

    def test_delete_budget(self, client, test_budget, auth_headers):
        """Test deleting a budget."""
        response = client.delete(
            f"/api/v1/budgets/{test_budget.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_nonexistent_budget(self, client, auth_headers):
        """Test deleting a non-existent budget."""
        response = client.delete("/api/v1/budgets/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.budgets
class TestBudgetReset:
    """Test budget reset functionality."""

    def test_reset_monthly_budgets(self, client, test_budget, auth_headers):
        """Test resetting monthly budgets."""
        response = client.post("/api/v1/budgets/reset-monthly", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
