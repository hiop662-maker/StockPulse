import logging
import time
from typing import Any, Dict, List, Optional
import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import yfinance as yf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stocks", tags=["Stocks"])


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


# --- Pydantic Modelle ---
class StockSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    type_disp: str


class StockQuote(BaseModel):
    symbol: str
    name: Optional[str] = None
    shortName: Optional[str] = None
    currentPrice: Optional[float] = None
    marketCap: Optional[float] = None
    trailingPE: Optional[float] = None
    forwardPE: Optional[float] = None
    fiftyTwoWeekLow: Optional[float] = None
    fiftyTwoWeekHigh: Optional[float] = None
    currency: Optional[str] = "USD"
    recommendationKey: Optional[str] = None


class ChartPoint(BaseModel):
    date: str
    price: float
    volume: Optional[int] = 0


# --- Endpoints ---

@router.get("/search", response_model=List[StockSearchResult])
async def search_stocks(
    q: str = Query(..., min_length=1, description="Suchbegriff nach Name oder Ticker")
):
    query = q.strip().upper()
    cache_key = f"search_{query}"

    # 1. Cache-Hit prüfen (TTL: 10 Minuten)
    cached_results = market_cache.get(cache_key)
    if cached_results is not None:
        return cached_results

    results: List[StockSearchResult] = []

    # 2. Direktaufruf an Yahoo Finance Autocomplete
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=10&newsCount=0"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                quotes = data.get("quotes", [])
                for item in quotes:
                    quote_type = item.get("quoteType", "").upper()
                    if quote_type in ["EQUITY", "ETF", "MUTUALFUND", "INDEX"]:
                        results.append(
                            StockSearchResult(
                                symbol=item.get("symbol", "").upper(),
                                name=item.get("shortname")
                                or item.get("longname")
                                or item.get("symbol", ""),
                                exchange=item.get("exchDisp")
                                or item.get("exchange")
                                or "N/A",
                                type_disp=item.get("typeDisp") or "Aktie",
                            )
                        )
                if results:
                    market_cache.set(cache_key, results, ttl_seconds=600)
                    return results
    except Exception as e:
        logger.warning(f"Direkte Yahoo-Suche fehlgeschlagen: {e}")

    # 3. Fallback über yfinance.Search
    try:
        search = yf.Search(query, max_results=8)
        quotes = getattr(search, "quotes", []) or []
        for quote in quotes:
            symbol = quote.get("symbol")
            if not symbol:
                continue
            results.append(
                StockSearchResult(
                    symbol=symbol.upper(),
                    name=quote.get("shortname")
                    or quote.get("longname")
                    or quote.get("name")
                    or symbol,
                    exchange=quote.get("exchange") or "N/A",
                    type_disp=quote.get("typeDisp") or "Aktie",
                )
            )
        if results:
            market_cache.set(cache_key, results, ttl_seconds=600)
        return results
    except Exception as e:
        logger.error(f"Fallback yf.Search fehlgeschlagen: {e}")
        stale = market_cache.get_stale(cache_key)
        return stale if stale is not None else []


@router.get("/quote/{symbol}", response_model=StockQuote)
async def get_stock_quote(symbol: str):
    clean_symbol = symbol.strip().upper()
    cache_key = f"quote_{clean_symbol}"

    # Cache-Hit prüfen (TTL: 60 Sekunden für Live-Quotes)
    cached_quote = market_cache.get(cache_key)
    if cached_quote is not None:
        return cached_quote

    try:
        ticker = yf.Ticker(clean_symbol)
        info = ticker.info or {}

        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
        )

        if price is None:
            raise ValueError(f"Keine Kursdaten für {clean_symbol} ermittelbar.")

        quote_data = StockQuote(
            symbol=clean_symbol,
            name=info.get("longName") or info.get("shortName") or clean_symbol,
            shortName=info.get("shortName") or clean_symbol,
            currentPrice=float(price),
            marketCap=info.get("marketCap"),
            trailingPE=info.get("trailingPE"),
            forwardPE=info.get("forwardPE"),
            fiftyTwoWeekLow=info.get("fiftyTwoWeekLow"),
            fiftyTwoWeekHigh=info.get("fiftyTwoWeekHigh"),
            currency=info.get("currency", "USD"),
            recommendationKey=info.get("recommendationKey"),
        )

        market_cache.set(cache_key, quote_data, ttl_seconds=60)
        return quote_data

    except Exception as e:
        logger.warning(f"Yahoo-Fehler bei Quote {clean_symbol}: {e}")
        stale = market_cache.get_stale(cache_key)
        if stale is not None:
            return stale
        raise HTTPException(
            status_code=404,
            detail=f"Kursdaten für '{clean_symbol}' konnten nicht geladen werden.",
        )


@router.get("/history/{symbol}", response_model=List[ChartPoint])
async def get_stock_history(symbol: str, period: str = "6mo"):
    clean_symbol = symbol.strip().upper()
    clean_period = period.strip().lower()
    cache_key = f"history_{clean_symbol}_{clean_period}"

    # Cache-Hit prüfen (TTL: 5 Minuten = 300 Sekunden)
    cached_history = market_cache.get(cache_key)
    if cached_history is not None:
        return cached_history

    try:
        ticker = yf.Ticker(clean_symbol)
        df = ticker.history(period=clean_period)

        if df.empty:
            raise ValueError(f"Keine historischen Daten für {clean_symbol} vorhanden.")

        history_points: List[ChartPoint] = []
        for index, row in df.iterrows():
            date_str = index.strftime("%Y-%m-%d")
            history_points.append(
                ChartPoint(
                    date=date_str,
                    price=round(float(row["Close"]), 2),
                    volume=int(row.get("Volume", 0)),
                )
            )

        market_cache.set(cache_key, history_points, ttl_seconds=300)
        return history_points

    except Exception as e:
        logger.warning(f"Yahoo-Fehler bei History {clean_symbol}: {e}")
        stale = market_cache.get_stale(cache_key)
        if stale is not None:
            return stale
        raise HTTPException(
            status_code=404,
            detail=f"Historie für '{clean_symbol}' konnte nicht geladen werden.",
        )