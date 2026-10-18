from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    ai_features_enabled = Column(Boolean, default=True, nullable=False)
    encrypted_gemini_key = Column(String, nullable=True)
    gemini_key_last4 = Column(String(4), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")

    @property
    def has_custom_api_key(self) -> bool:
        return bool(self.encrypted_gemini_key)

    @property
    def api_key_last4(self) -> str | None:
        return self.gemini_key_last4 if self.encrypted_gemini_key else None


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_watchlist_user_symbol"),
    )

    user = relationship("User", back_populates="watchlist")