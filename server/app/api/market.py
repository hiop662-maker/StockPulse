import time
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query
from app.services.market_data import market_service

router = APIRouter(prefix="/market", tags=["Market Data"])

# In-Memory Cache für den Wechselkurs (1 Stunde gültig)
_FX_CACHE = {
    "rate": 1.08,
    "last_updated": 0.0,
    "ttl_seconds": 3600
}


@router.get("/quote/{ticker}")
def get_quote(ticker: str):
    try:
        data = market_service.get_quote_and_metrics(ticker)
        if not data.get("currentPrice"):
            raise HTTPException(
                status_code=404,
                detail=f"Ticker '{ticker}' nicht gefunden oder keine Kursdaten verfügbar.",
            )
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Abrufen der Marktdaten: {str(e)}",
        )


@router.get("/history/{ticker}")
def get_history(
    ticker: str,
    period: str = Query(
        "1y", description="Gültige Intervalle: 1mo, 3mo, 6mo, 1y, 5y, max"
    ),
    interval: str = Query("1d", description="Gültige Schritte: 1d, 1wk, 1mo"),
):
    try:
        data = market_service.get_price_history(
            ticker, period=period, interval=interval
        )
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"Keine historischen Daten für '{ticker}' gefunden.",
            )
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Fehler beim Abrufen der Historie: {str(e)}"
        )


@router.get("/fx-rate")
def get_fx_rate(pair: str = "EURUSD=X"):
    """Liefert den aktuellen Wechselkurs aus dem Cache oder aktualisiert ihn via yfinance."""
    now = time.time()
    
    # 1. Cache-Treffer: Sofortige Antwort (< 2ms)
    if now - _FX_CACHE["last_updated"] < _FX_CACHE["ttl_seconds"]:
        return {"pair": pair, "rate": _FX_CACHE["rate"], "cached": True}
    
    # 2. Cache abgelaufen: Aktualisieren
    try:
        ticker = yf.Ticker(pair)
        data = ticker.history(period="1d")
        if not data.empty:
            _FX_CACHE["rate"] = round(float(data["Close"].iloc[-1]), 4)
            _FX_CACHE["last_updated"] = now
    except Exception:
        # Bei Verbindungsfehlern Fallback-Wert beibehalten
        pass

    return {"pair": pair, "rate": _FX_CACHE["rate"], "cached": False}