import pytest
from fastapi import status
from datetime import datetime, timezone


@pytest.mark.transactions
class TestTransactionCreation:
    """Test transaction creation endpoints."""

    def test_create_expense_transaction(self, client, test_user, auth_headers):
        """Test creating an expense transaction."""
        response = client.post(
            "/api/v1/transactions/",
            headers=auth_headers,
            json={
                "amount": 50.00,
                "category": "groceries",
                "type": "expense",
                "description": "Weekly shopping",
                "date": datetime.now(timezone.utc).isoformat()
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["amount"] == 50.0
        assert data["category"] == "groceries"
        assert data["type"] == "expense"
        assert data["user_id"] == test_user.id

    def test_create_income_transaction(self, client, test_user, auth_headers):
        """Test creating an income transaction."""
        response = client.post(
            "/api/v1/transactions/",
            headers=auth_headers,
            json={
                "amount": 1000.00,
                "category": "salary",
                "type": "income",
                "description": "Monthly salary",
                "date": datetime.now(timezone.utc).isoformat()
            }
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["type"] == "income"
        assert data["amount"] == 1000.0

    def test_create_transaction_unauthorized(self, client):
        """Test creating transaction without auth."""
        response = client.post(
            "/api/v1/transactions/",
            json={
                "amount": 50.00,
                "category": "groceries",
                "type": "expense",
                "date": datetime.now(timezone.utc).isoformat()
            }
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.transactions
class TestTransactionRetrieval:
    """Test transaction retrieval endpoints."""

    def test_list_transactions(self, client, test_user, test_transaction, auth_headers):
        """Test listing user transactions."""
        response = client.get("/api/v1/transactions/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_transaction_by_id(self, client, test_user, test_transaction, auth_headers):
        """Test getting a specific transaction."""
        response = client.get(
            f"/api/v1/transactions/{test_transaction.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_transaction.id
        assert data["category"] == test_transaction.category

    def test_get_nonexistent_transaction(self, client, auth_headers):
        """Test getting a non-existent transaction."""
        response = client.get("/api/v1/transactions/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.transactions
class TestTransactionUpdate:
    """Test transaction update endpoints."""

    def test_update_transaction(self, client, test_transaction, auth_headers):
        """Test updating a transaction."""
        response = client.patch(
            f"/api/v1/transactions/{test_transaction.id}",
            headers=auth_headers,
            json={
                "amount": 75.00,
                "description": "Updated description"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["amount"] == 75.0
        assert data["description"] == "Updated description"

    def test_update_nonexistent_transaction(self, client, auth_headers):
        """Test updating a non-existent transaction."""
        response = client.patch(
            "/api/v1/transactions/99999",
            headers=auth_headers,
            json={"amount": 100.00}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.transactions
class TestTransactionDeletion:
    """Test transaction deletion endpoints."""

    def test_delete_transaction(self, client, test_transaction, auth_headers):
        """Test deleting a transaction (soft delete)."""
        response = client.delete(
            f"/api/v1/transactions/{test_transaction.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_nonexistent_transaction(self, client, auth_headers):
        """Test deleting a non-existent transaction."""
        response = client.delete("/api/v1/transactions/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
