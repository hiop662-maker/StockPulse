from fastapi import APIRouter, HTTPException, Query
from app.services.market_data import market_service

router = APIRouter(prefix="/market", tags=["Market Data"])


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