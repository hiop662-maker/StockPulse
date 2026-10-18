import logging
import os
from typing import Optional
from fastapi import HTTPException, status
from google import genai
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decrypt_api_key
from app.db.models import User

logger = logging.getLogger(__name__)


def validate_gemini_api_key(raw_key: str) -> bool:
    """Prüft einen Gemini-API-Key live gegen die Google-API (models.list)."""
    clean_key = raw_key.strip()
    if len(clean_key) < 20:
        return False
    try:
        client = genai.Client(
            api_key=clean_key,
            http_options={"timeout": 5000},  # 5 Sekunden Timeout
        )
        # Leichtgewichtiger Test-Abruf
        models_iter = client.models.list()
        next(iter(models_iter), None)
        return True
    except Exception as exc:
        # Niemals den Klartext-Key loggen!
        logger.warning("Gemini API-Key Validierung fehlgeschlagen: %s", type(exc).__name__)
        return False


def resolve_user_api_key(
    user: Optional[User] = None,
    db: Optional[Session] = None,
) -> tuple[str, bool]:
    """
    Löst den zu verwendenden API-Key auf.
    Rückgabe: (api_key, is_custom_user_key)
    """
    if user and user.encrypted_gemini_key:
        decrypted = decrypt_api_key(user.encrypted_gemini_key)
        if decrypted:
            return decrypted, True

        # Korrupter Ciphertext oder ENCRYPTION_SECRET_KEY wurde rotiert -> sauber zurücksetzen
        logger.warning("Korrupter API-Key-Ciphertext für User ID %s zurückgesetzt.", user.id)
        user.encrypted_gemini_key = None
        user.gemini_key_last4 = None
        if db is not None:
            db.commit()
            db.refresh(user)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Dein gespeicherter API-Key konnte nicht entschlüsselt werden. Bitte gib ihn in den Kontoeinstellungen erneut ein.",
        )

    fallback_key = (settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY") or "").strip()
    if fallback_key:
        return fallback_key, False

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Kein API-Key hinterlegt. Bitte füge deinen Gemini-API-Key in den Einstellungen hinzu.",
    )


def get_genai_client(
    user: Optional[User] = None,
    db: Optional[Session] = None,
) -> genai.Client:
    """Gibt eine konfigurierte genai.Client-Instanz für den User oder den Server-Fallback zurück."""
    api_key, _ = resolve_user_api_key(user=user, db=db)
    return genai.Client(api_key=api_key)


def handle_genai_exception(exc: Exception, is_custom_key: bool) -> None:
    """Übersetzt Upstream-Fehler des Gemini-SDKs in saubere HTTPExceptions ohne Key-Leakage."""
    msg = str(exc).upper()
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "QUOTA" in msg:
        detail = (
            "Dein hinterlegter Gemini-API-Key ist abgelaufen, ungültig oder hat sein Kontingent erreicht. Bitte prüfe ihn in den Kontoeinstellungen."
            if is_custom_key
            else "Das globale KI-Kontingent ist vorübergehend erschöpft. Bitte hinterlege deinen eigenen Gemini-API-Key in den Kontoeinstellungen."
        )
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)

    if "401" in msg or "403" in msg or "API_KEY_INVALID" in msg or "PERMISSION_DENIED" in msg or "UNAUTHENTICATED" in msg:
        detail = (
            "Dein hinterlegter Gemini-API-Key ist abgelaufen, ungültig oder hat sein Kontingent erreicht. Bitte prüfe ihn in den Kontoeinstellungen."
            if is_custom_key
            else "Der Server-API-Key ist ungültig oder nicht autorisiert."
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)