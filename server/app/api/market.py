import time
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query
import yfinance as yf
from app.services.market_data import market_service

router = APIRouter(prefix="/market", tags=["Market Data"])


# --- In-Memory Caching Layer mit TTL & Stale-Fallback ---
class SimpleMemoryCache:
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if not entry:
            return None
        if time.time() < entry["expires_at"]:
            return entry["value"]
        return None

    def get_stale(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        return entry.get("last_valid") if entry else None

    def set(self, key: str, value: Any, ttl_seconds: int = 60) -> None:
        self._store[key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
            "last_valid": value,
        }

    def clear(self) -> None:
        self._store.clear()


market_cache = SimpleMemoryCache()

# In-Memory Cache für den Wechselkurs (1 Stunde gültig)
_FX_CACHE = {
    "rate": 1.08,
    "last_updated": 0.0,
    "ttl_seconds": 3600,
}


@router.get("/quote/{ticker}")
def get_quote(ticker: str):
    clean_ticker = ticker.strip().upper()
    cache_key = f"quote_{clean_ticker}"

    # 1. Cache-Hit prüfen (60 Sekunden TTL)
    cached_data = market_cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    try:
        data = market_service.get_quote_and_metrics(clean_ticker)
        if not data or not data.get("currentPrice"):
            raise HTTPException(
                status_code=404,
                detail=f"Ticker '{clean_ticker}' nicht gefunden oder keine Kursdaten verfügbar.",
            )

        # Im Cache ablegen
        market_cache.set(cache_key, data, ttl_seconds=60)
        return data

    except HTTPException:
        raise
    except Exception as e:
        # Fallback auf letzten gültigen Zustand
        stale_data = market_cache.get_stale(cache_key)
        if stale_data is not None:
            return stale_data

        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Abrufen der Marktdaten: {str(e)}",
        )


@router.get("/history/{ticker}")
def get_history(
    ticker: str,
    period: str = Query(
        default="6mo",
        pattern="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$",
        description="Gültige Zeiträume: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max",
    ),
    interval: Optional[str] = Query(
        default=None,
        description="Gültige Schritte: 1d, 1wk, 1mo (wird bei None automatisch optimiert)",
    ),
):
    clean_ticker = ticker.strip().upper()
    selected_interval = interval
    if not selected_interval:
        selected_interval = "1wk" if period == "max" else "1d"

    cache_key = f"history_{clean_ticker}_{period}_{selected_interval}"

    # 1. Cache-Hit prüfen (5 Minuten = 300 Sekunden TTL)
    cached_history = market_cache.get(cache_key)
    if cached_history is not None:
        return cached_history

    try:
        data = market_service.get_price_history(
            clean_ticker, period=period, interval=selected_interval
        )
        history_result = data if data else []

        if history_result:
            market_cache.set(cache_key, history_result, ttl_seconds=300)

        return history_result
    except Exception:
        stale_history = market_cache.get_stale(cache_key)
        return stale_history if stale_history is not None else []


@router.get("/fx-rate")
@router.get("/fx/{pair:path}")
def get_fx_rate(pair: str = "EURUSD=X"):
    """Liefert den aktuellen Wechselkurs aus dem Cache oder aktualisiert ihn via yfinance."""
    now = time.time()

    if now - _FX_CACHE["last_updated"] < _FX_CACHE["ttl_seconds"]:
        return {"pair": pair, "rate": _FX_CACHE["rate"], "cached": True}

    try:
        ticker = yf.Ticker(pair)
        data = ticker.history(period="1d")
        if not data.empty:
            _FX_CACHE["rate"] = round(float(data["Close"].iloc[-1]), 4)
            _FX_CACHE["last_updated"] = now
    except Exception:
        pass

    return {"pair": pair, "rate": _FX_CACHE["rate"], "cached": False}