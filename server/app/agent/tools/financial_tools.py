from typing import Any
import numpy as np
import pandas as pd
import yfinance as yf


def get_stock_fundamentals(ticker: str) -> dict[str, Any]:
  """Fetches real-time market data, valuation multiples (P/E, PEG), and key metrics for a given stock/ETF ticker symbol.

  Args:
      ticker: The stock ticker symbol (e.g. 'AAPL', 'MSFT', 'VOO').
  """
  stock = yf.Ticker(ticker)
  info = stock.info

  return {
      "symbol": ticker.upper(),
      "name": info.get("shortName") or info.get("longName", ticker),
      "current_price": info.get("currentPrice")
      or info.get("regularMarketPrice"),
      "currency": info.get("currency", "USD"),
      "pe_trailing": info.get("trailingPE"),
      "pe_forward": info.get("forwardPE"),
      "peg_ratio": info.get("pegRatio"),
      "market_cap": info.get("marketCap"),
      "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
      "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
      "dividend_yield": info.get("dividendYield"),
      "recommendation_mean": info.get("recommendationMean"),
      "recommendation_key": info.get("recommendationKey"),
  }


def calculate_technical_indicators(
    ticker: str, period: str = "6mo"
) -> dict[str, Any]:
  """Calculates technical indicators such as 50-day SMA, 200-day SMA, and 14-day Relative Strength Index (RSI).

  Args:
      ticker: The stock ticker symbol (e.g. 'AAPL', 'NVDA').
      period: Historical period to look back ('3mo', '6mo', '1y').
  """
  stock = yf.Ticker(ticker)
  df = stock.history(period=period)

  if df.empty or len(df) < 14:
    return {
        "error": "Not enough historical data to calculate technical indicators."
    }

  close = df["Close"]

  # Simple Moving Averages
  sma_50 = float(close.rolling(window=50).mean().iloc[-1]) if len(df) >= 50 else None
  sma_200 = (
      float(close.rolling(window=200).mean().iloc[-1]) if len(df) >= 200 else None
  )

  # RSI (14 Days)
  delta = close.diff()
  gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
  loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
  rs = gain / loss
  rsi_series = 100 - (100 / (1 + rs))
  current_rsi = (
      float(rsi_series.iloc[-1]) if not np.isnan(rsi_series.iloc[-1]) else None
  )

  current_price = float(close.iloc[-1])

  return {
      "symbol": ticker.upper(),
      "current_price": round(current_price, 2),
      "rsi_14": round(current_rsi, 2) if current_rsi else "N/A",
      "rsi_condition": (
          "Overbought (>70)"
          if current_rsi and current_rsi > 70
          else (
              "Oversold (<30)"
              if current_rsi and current_rsi < 30
              else "Neutral (30-70)"
          )
      ),
      "sma_50": round(sma_50, 2) if sma_50 else "N/A",
      "sma_200": round(sma_200, 2) if sma_200 else "N/A",
      "above_sma_50": (current_price > sma_50) if sma_50 else "N/A",
  }