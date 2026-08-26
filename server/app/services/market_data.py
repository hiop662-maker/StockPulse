from typing import Any
import pandas as pd
import yfinance as yf


class MarketDataService:

    @staticmethod
    def get_quote_and_metrics(ticker: str) -> dict[str, Any]:
        stock = yf.Ticker(ticker)

        # 1. Info & FastInfo abrufen
        try:
            info = stock.info or {}
        except Exception:
            info = {}

        fast_info = getattr(stock, "fast_info", None)

        # 2. Kurs ermitteln (mit robusten Fallbacks)
        current_price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or (getattr(fast_info, "last_price", None) if fast_info else None)
            or info.get("previousClose")
        )

        # Notfall-Fallback auf letzten Schlusskurs aus history
        if not current_price:
            try:
                hist = stock.history(period="1d")
                if not hist.empty:
                    current_price = float(hist["Close"].iloc[-1])
            except Exception:
                current_price = None

        # 3. Analysten-Empfehlung ermitteln
        recommendation = (
            info.get("recommendationKey")
            or info.get("recommendation_key")
            or info.get("targetPriceStatus")
            or "N/A"
        )
        if (
            recommendation == "N/A"
            and info.get("recommendationMean") is not None
        ):
            try:
                mean = float(info["recommendationMean"])
                if mean <= 1.5:
                    recommendation = "strong_buy"
                elif mean <= 2.5:
                    recommendation = "buy"
                elif mean <= 3.5:
                    recommendation = "hold"
                elif mean <= 4.5:
                    recommendation = "underperform"
                else:
                    recommendation = "sell"
            except (ValueError, TypeError):
                pass

        return {
            "symbol": ticker.upper(),
            "shortName": info.get("shortName")
            or info.get("longName")
            or ticker.upper(),
            "currency": info.get("currency")
            or (getattr(fast_info, "currency", "USD") if fast_info else "USD"),
            "currentPrice": (
                round(float(current_price), 2) if current_price else None
            ),
            "marketCap": info.get("marketCap")
            or (getattr(fast_info, "market_cap", None) if fast_info else None),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow")
            or (getattr(fast_info, "year_low", None) if fast_info else None),
            "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh")
            or (getattr(fast_info, "year_high", None) if fast_info else None),
            "recommendationKey": recommendation,
        }

    @staticmethod
    def get_price_history(
        ticker: str, period: str = "6mo", interval: str = "1d"
    ) -> list[dict[str, Any]]:
        """Holt historische OHLCV-Zeitreihendaten für Recharts / Candlestick-Charts."""
        stock = yf.Ticker(ticker)
        df: pd.DataFrame = stock.history(period=period, interval=interval)

        if df.empty:
            return []

        # Index zu Spalte wandeln und Name absichern
        df.reset_index(inplace=True)
        date_col = "Date" if "Date" in df.columns else "Datetime"

        history = []
        for _, row in df.iterrows():
            date_val = row[date_col]
            date_str = (
                date_val.strftime("%Y-%m-%d")
                if hasattr(date_val, "strftime")
                else str(date_val)
            )
            history.append(
                {
                    "date": date_str,
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]),
                }
            )
        return history


market_service = MarketDataService()