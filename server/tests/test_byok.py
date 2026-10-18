from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import decrypt_api_key, encrypt_api_key
from app.db.models import User
from app.services.genai_client import resolve_user_api_key

client = TestClient(app)


def _register_and_login(email: str = "byok@example.com", password: str = "Secret123!"):
    client.post("/api/auth/register", json={"email": email, "password": password})
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_fernet_encryption_roundtrip():
    raw_key = "AIzaSyTestKey12345678909876"
    encrypted = encrypt_api_key(raw_key)
    assert encrypted != raw_key
    assert "AIzaSy" not in encrypted
    assert decrypt_api_key(encrypted) == raw_key


@patch("app.api.auth.validate_gemini_api_key", return_value=True)
def test_save_and_delete_user_api_key_happy_path(mock_validate):
    token = _register_and_login("byok_happy@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    raw_key = "AIzaSyValidUserKey1234569876"

    # 1. Speichern
    res = client.put("/api/auth/api-key", json={"api_key": raw_key}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["has_custom_api_key"] is True
    assert data["api_key_last4"] == "9876"
    assert raw_key not in res.text  # Zero-Plaintext-Leakage

    # 2. Prüfen über /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["has_custom_api_key"] is True
    assert me_data["api_key_last4"] == "9876"
    assert "encrypted_gemini_key" not in me_data
    assert raw_key not in me_res.text

    # 3. Löschen
    del_res = client.delete("/api/auth/api-key", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["has_custom_api_key"] is False
    assert del_res.json()["api_key_last4"] is None


@patch("app.api.auth.validate_gemini_api_key", return_value=False)
def test_save_invalid_api_key_rejected(mock_validate):
    token = _register_and_login("byok_invalid@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/auth/api-key",
        json={"api_key": "AIzaSy_INVALID_KEY_1234567890"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Ungültiger Gemini-API-Key" in res.json()["detail"]


def test_corrupted_ciphertext_resets_cleanly():
    dummy_user = User(
        id=999,
        email="corrupt@example.com",
        hashed_password="x",
        encrypted_gemini_key="corrupted-fernet-token-that-fails",
        gemini_key_last4="1234",
    )
    mock_db = MagicMock()

    try:
        resolve_user_api_key(user=dummy_user, db=mock_db)
        assert False, "Sollte 401 HTTPException werfen"
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 401
        assert dummy_user.encrypted_gemini_key is None
        assert dummy_user.gemini_key_last4 is None
        mock_db.commit.assert_called_once()