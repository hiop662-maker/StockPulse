from datetime import datetime
from pydantic import BaseModel


class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    added_at: datetime

    class Config:
        from_attributes = True