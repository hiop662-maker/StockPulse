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

def test_forgot_password_unregistered_email_fails(client):
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "notfound@stockpulse.dev"},
    )
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert "nicht registriert" in res.json()["detail"]

def test_forgot_password_success(client, test_user):
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": test_user.email},
    )
    assert res.status_code == status.HTTP_200_OK
    assert "versendet" in res.json()["message"]

def test_reset_password_flow_success(client, test_user):
    from app.core.security import create_password_reset_token
    token = create_password_reset_token(test_user.email)

    # Passwort zurücksetzen
    res = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "BrandNewPassword123!"},
    )
    assert res.status_code == status.HTTP_200_OK

    # Login mit altem Passwort schlägt fehl
    login_old = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "SecretPassword123!"},
    )
    assert login_old.status_code == status.HTTP_401_UNAUTHORIZED

    # Login mit neuem Passwort erfolgreich
    login_new = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "BrandNewPassword123!"},
    )
    assert login_new.status_code == status.HTTP_200_OK

def test_reset_password_invalid_or_expired_token(client):
    res = client.post(
        "/api/auth/reset-password",
        json={"token": "invalid.jwt.token", "new_password": "NewPassword123!"},
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST

from fastapi import status


def test_forgot_password_unregistered_email_fails(client):
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "nicht-vorhanden@stockpulse.dev"},
    )
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert "nicht registriert" in res.json()["detail"]


def test_forgot_password_success(client):
    # Registriere einen Testbenutzer
    email = "reset_user@stockpulse.dev"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "InitialPassword123!"},
    )

    res = client.post(
        "/api/auth/forgot-password",
        json={"email": email},
    )
    assert res.status_code == status.HTTP_200_OK
    assert "versendet" in res.json()["message"]


def test_reset_password_flow_success(client):
    from app.core.security import create_password_reset_token

    email = "pw_flow@stockpulse.dev"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "OldPassword123!"},
    )

    token = create_password_reset_token(email)

    # 1. Passwort via Token neu setzen
    res = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "NewSecretPassword123!"},
    )
    assert res.status_code == status.HTTP_200_OK

    # 2. Login mit altem Passwort muss fehlschlagen
    login_old = client.post(
        "/api/auth/login",
        json={"email": email, "password": "OldPassword123!"},
    )
    assert login_old.status_code == status.HTTP_401_UNAUTHORIZED

    # 3. Login mit neuem Passwort muss klappen
    login_new = client.post(
        "/api/auth/login",
        json={"email": email, "password": "NewSecretPassword123!"},
    )
    assert login_new.status_code == status.HTTP_200_OK
    assert "access_token" in login_new.json()


def test_reset_password_invalid_or_expired_token(client):
    res = client.post(
        "/api/auth/reset-password",
        json={"token": "ungueltiges.jwt.token", "new_password": "NewPassword123!"},
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "ungültig oder abgelaufen" in res.json()["detail"]