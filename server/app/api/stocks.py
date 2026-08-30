import logging
from typing import List
import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel
import yfinance as yf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stocks", tags=["Stocks"])


class StockSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    type_disp: str


@router.get("/search", response_model=List[StockSearchResult])
async def search_stocks(
    q: str = Query(..., min_length=1, description="Suchbegriff nach Name oder Ticker")
):
    query = q.strip()
    results: List[StockSearchResult] = []

    # 1. Schneller & zuverlässiger Direktaufruf an Yahoo Finance Autocomplete
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
                    return results
    except Exception as e:
        logger.warning(f"Direkte Yahoo-Suche fehlgeschlagen: {e}")

    # 2. Fallback über yfinance.Search
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
        return results
    except Exception as e:
        logger.error(f"Fallback yf.Search fehlgeschlagen: {e}")
        return []