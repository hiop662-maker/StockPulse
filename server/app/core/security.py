import base64
import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from jose import jwt, JWTError

from app.core.config import settings

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "stockpulse_jwt_secret_dev_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 Tage
RESET_TOKEN_EXPIRE_MINUTES = 15


def _get_fernet() -> Fernet:
    """Erzeugt eine deterministische 32-Byte URL-safe Base64 Fernet-Instanz."""
    raw_secret = (
        settings.ENCRYPTION_SECRET_KEY
        or os.getenv("ENCRYPTION_SECRET_KEY")
        or SECRET_KEY
    )
    digest = hashlib.sha256(raw_secret.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(digest)
    return Fernet(fernet_key)


def encrypt_api_key(raw_key: str) -> str:
    """Verschlüsselt einen API-Key symmetrisch via Fernet (AES-128-CBC + HMAC-SHA256)."""
    clean_key = raw_key.strip()
    return _get_fernet().encrypt(clean_key.encode("utf-8")).decode("utf-8")


def decrypt_api_key(token: str) -> Optional[str]:
    """Entschlüsselt einen Fernet-Token. Gibt None zurück, falls korrupt oder Secret rotiert."""
    if not token:
        return None
    try:
        return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError, Exception):
        return None


def mask_api_key_last4(raw_key: str) -> str:
    """Extrahiert die letzten 4 Zeichen eines API-Keys zur sicheren UI-Anzeige."""
    clean_key = raw_key.strip()
    return clean_key[-4:] if len(clean_key) >= 4 else clean_key


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_password_reset_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": email,
        "type": "password_reset",
        "exp": expire,
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password_reset_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None