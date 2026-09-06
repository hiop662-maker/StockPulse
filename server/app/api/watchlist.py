from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
# 1. Models aus app.db.models importieren:
from app.db.models import Watchlist, User

# 2. get_current_user importieren (prüfe kurz, wo es in auth.py definiert ist, meist eins von diesen beiden):
from app.api.auth import get_current_user
# Falls es nicht in app.api.auth liegt, teste:
# from app.core.security import get_current_user

# 3. Pydantic-Schema (falls unter app/schemas angelegt):
from app.schemas.watchlist import WatchlistResponse

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.get("", response_model=List[WatchlistResponse])
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liefert alle gespeicherten Ticker des aktuell angemeldeten Nutzers."""
    return (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.added_at.desc())
        .all()
    )


@router.post("/{ticker}", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def add_ticker_to_watchlist(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fügt einen Ticker zur Watchlist des Nutzers hinzu."""
    clean_symbol = ticker.strip().upper()

    existing = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id, Watchlist.symbol == clean_symbol)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ticker '{clean_symbol}' ist bereits in deiner Watchlist.",
        )

    item = Watchlist(user_id=current_user.id, symbol=clean_symbol)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{ticker}", status_code=status.HTTP_204_NO_CONTENT)
def remove_ticker_from_watchlist(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Entfernt einen Ticker aus der Watchlist des Nutzers."""
    clean_symbol = ticker.strip().upper()

    item = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id, Watchlist.symbol == clean_symbol)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{clean_symbol}' nicht in der Watchlist gefunden.",
        )

    db.delete(item)
    db.commit()
    return None