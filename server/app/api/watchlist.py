import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List
import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Watchlist, User
from app.api.auth import get_current_user
from app.schemas.watchlist import (
    WatchlistItemResponse,
    WatchlistSummaryItem,
)

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

executor = ThreadPoolExecutor(max_workers=5)


def _fetch_single_summary(item_id: int, symbol: str) -> WatchlistSummaryItem:
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1mo")

        if hist.empty:
            return WatchlistSummaryItem(
                id=item_id,
                symbol=symbol,
                current_price=None,
                change_percent_24h=None,
                sparkline_1mo=[],
            )

        closes = [round(float(val), 2) for val in hist["Close"].dropna().tolist()]
        current_price = closes[-1] if closes else None

        change_percent = 0.0
        if len(closes) >= 2 and closes[-2] > 0:
            change_percent = round(((closes[-1] - closes[-2]) / closes[-2]) * 100, 2)

        fast_info = getattr(ticker, "fast_info", {})
        currency = getattr(fast_info, "currency", "USD") or "USD"

        info = getattr(ticker, "info", {})
        name = info.get("shortName") or info.get("name") or symbol

        return WatchlistSummaryItem(
            id=item_id,
            symbol=symbol,
            name=name,
            currency=currency,
            current_price=current_price,
            change_percent_24h=change_percent,
            sparkline_1mo=closes,
        )
    except Exception:
        return WatchlistSummaryItem(
            id=item_id,
            symbol=symbol,
            current_price=None,
            change_percent_24h=None,
            sparkline_1mo=[],
        )


@router.get("/summary", response_model=List[WatchlistSummaryItem])
async def get_watchlist_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.added_at.desc())
        .all()
    )

    if not items:
        return []

    loop = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(executor, _fetch_single_summary, item.id, item.symbol)
        for item in items
    ]
    results = await asyncio.gather(*tasks)
    return results


@router.get("", response_model=List[WatchlistItemResponse])
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.added_at.desc())
        .all()
    )


@router.post("/{symbol}", response_model=WatchlistItemResponse)
def add_to_watchlist(
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clean_symbol = symbol.strip().upper()
    existing = (
        db.query(Watchlist)
        .filter(
            Watchlist.user_id == current_user.id,
            Watchlist.symbol == clean_symbol,
        )
        .first()
    )
    if existing:
        return existing

    item = Watchlist(user_id=current_user.id, symbol=clean_symbol)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{symbol}")
def remove_from_watchlist(
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clean_symbol = symbol.strip().upper()
    item = (
        db.query(Watchlist)
        .filter(
            Watchlist.user_id == current_user.id,
            Watchlist.symbol == clean_symbol,
        )
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{clean_symbol} ist nicht in der Watchlist",
        )

    db.delete(item)
    db.commit()
    return {"message": f"{clean_symbol} wurde entfernt"}