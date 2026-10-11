import pytest
from fastapi import status
from fastapi.testclient import TestClient


def test_update_settings_unauthorized(client: TestClient):
    """Prüft, dass nicht autorisierte Requests mit 401 abgelehnt werden."""
    response = client.patch(
        "/api/auth/settings",
        json={"ai_features_enabled": False},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_ai_features_toggle(client: TestClient, test_user):
    """Prüft das Umschalten und Persistieren von ai_features_enabled."""
    # 1. Login mit existierendem test_user
    login_res = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "SecretPassword123!"},
    )
    assert login_res.status_code == status.HTTP_200_OK
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Deaktivieren der AI-Features (False)
    patch_res = client.patch(
        "/api/auth/settings",
        json={"ai_features_enabled": False},
        headers=headers,
    )
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["ai_features_enabled"] is False

    # 3. GET /api/auth/me abfragen und prüfen
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == status.HTTP_200_OK
    assert me_res.json()["ai_features_enabled"] is False

    # 4. Wieder aktivieren (True)
    patch_res_2 = client.patch(
        "/api/auth/settings",
        json={"ai_features_enabled": True},
        headers=headers,
    )
    assert patch_res_2.status_code == status.HTTP_200_OK
    assert patch_res_2.json()["ai_features_enabled"] is True