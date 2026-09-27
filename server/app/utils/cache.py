import time
from typing import Any, Optional


class SimpleMemoryCache:
    def __init__(self):
        # Struktur: { key: {"value": Any, "expires_at": float, "last_valid": Any} }
        self._store: dict[str, dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Gibt den gecachten Wert zurück, wenn er noch nicht abgelaufen ist."""
        entry = self._store.get(key)
        if not entry:
            return None

        if time.time() < entry["expires_at"]:
            return entry["value"]

        return None

    def get_stale(self, key: str) -> Optional[Any]:
        """Gibt den letzten bekannten Stand zurück, selbst wenn er abgelaufen ist (Fallback)."""
        entry = self._store.get(key)
        return entry.get("last_valid") if entry else None

    def set(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        """Speichert einen Wert mit Ablaufzeit."""
        self._store[key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
            "last_valid": value,
        }

    def clear(self) -> None:
        """Leert den gesamten Cache."""
        self._store.clear()


# Globale Instanz für die App
market_cache = SimpleMemoryCache()