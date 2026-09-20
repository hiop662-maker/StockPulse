from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class WatchlistItemBase(BaseModel):
    symbol: str


class WatchlistItemCreate(WatchlistItemBase):
    pass


class WatchlistItemResponse(WatchlistItemBase):
    id: int
    user_id: int
    added_at: datetime

    class Config:
        from_attributes = True


class WatchlistSummaryItem(BaseModel):
    id: int
    symbol: str
    name: Optional[str] = None
    currency: str = "USD"
    current_price: Optional[float] = None
    change_percent_24h: Optional[float] = None
    sparkline_1mo: List[float] = []