# server/tests/test_auth.py
from fastapi import status


def test_register_user_success(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "newuser@stockpulse.dev", "password": "SecurePassword123!"},
    )
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
    data = response.json()
    # Prüft entweder auf User-Response (email) oder Auth-Response (access_token)
    assert "email" in data or "access_token" in data or "id" in data


def test_register_duplicate_email_fails(client, test_user):
    response = client.post(
        "/api/auth/register",
        json={"email": test_user.email, "password": "AnotherPassword123!"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_login_success(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "SecretPassword123!"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password_fails(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "WrongPassword!"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED