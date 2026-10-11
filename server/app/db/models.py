from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    ai_features_enabled = Column(Boolean, default=True, nullable=False)  # <-- Neu
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")

    # In app/db/models.py:

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_watchlist_user_symbol"),
    )

    user = relationship("User", back_populates="watchlist")