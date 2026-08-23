from typing import Any
import pandas as pd
import yfinance as yf


class MarketDataService:

  @staticmethod
  def get_quote_and_metrics(ticker: str) -> dict[str, Any]:
    """Ruft Echtzeit-Kursdaten und Fundamentaldaten für ein Ticker-Symbol ab."""
    stock = yf.Ticker(ticker)
    info = stock.info

    # Sicheres Extrahieren relevanter Kennzahlen
    return {
        "symbol": ticker.upper(),
        "shortName": info.get("shortName") or info.get("longName", ticker),
        "currency": info.get("currency", "USD"),
        "currentPrice": info.get("currentPrice")
        or info.get("regularMarketPrice"),
        "previousClose": info.get("previousClose")
        or info.get("regularMarketPreviousClose"),
        "dayHigh": info.get("dayHigh"),
        "dayLow": info.get("dayLow"),
        "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
        "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
        "trailingPE": info.get("trailingPE"),
        "forwardPE": info.get("forwardPE"),
        "marketCap": info.get("marketCap"),
        "dividendYield": info.get("dividendYield"),
        "beta": info.get("beta"),
        "summary": info.get("longBusinessSummary"),
    }

  @staticmethod
  def get_price_history(
      ticker: str, period: str = "1y", interval: str = "1d"
  ) -> list[dict[str, Any]]:
    """Holt historische OHLCV-Zeitreihendaten für Recharts / Candlestick-Charts."""
    stock = yf.Ticker(ticker)
    df: pd.DataFrame = stock.history(period=period, interval=interval)

    if df.empty:
      return []

    # Reset Index, um den Zeitstempel als Spalte zu nutzen
    df.reset_index(inplace=True)

    # Formatieren für das Frontend
    history = []
    for _, row in df.iterrows():
      date_str = (
          row["Date"].strftime("%Y-%m-%d")
          if hasattr(row["Date"], "strftime")
          else str(row["Date"])
      )
      history.append({
          "date": date_str,
          "open": round(float(row["Open"]), 2),
          "high": round(float(row["High"]), 2),
          "low": round(float(row["Low"]), 2),
          "close": round(float(row["Close"]), 2),
          "volume": int(row["Volume"]),
      })
    return history


market_service = MarketDataService()