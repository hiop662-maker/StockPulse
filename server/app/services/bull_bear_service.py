import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import HTTPException
from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User
from app.schemas.ai import BullBearAnalysis
from app.api.stocks import get_stock_quote
from app.services.genai_client import get_genai_client, handle_genai_exception

# 24 Stunden TTL Cache (tägliches Caching)
_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 24 * 60 * 60


def _get_from_cache(symbol: str) -> Optional[BullBearAnalysis]:
    entry = _CACHE.get(symbol.upper())
    if entry and entry["expires_at"] > time.time():
        return entry["data"]
    if entry:
        del _CACHE[symbol.upper()]
    return None


def _save_to_cache(symbol: str, data: BullBearAnalysis) -> None:
    _CACHE[symbol.upper()] = {
        "data": data,
        "expires_at": time.time() + CACHE_TTL_SECONDS,
    }


def clear_bull_bear_cache(symbol: Optional[str] = None) -> None:
    """Hilfsfunktion zum Löschen des Caches (für Tests und Refreshes)."""
    if symbol:
        _CACHE.pop(symbol.upper(), None)
    else:
        _CACHE.clear()


async def generate_bull_bear_analysis(
    symbol: str,
    force_refresh: bool = False,
    user: Optional[User] = None,
    db: Optional[Session] = None,
) -> BullBearAnalysis:
    clean_symbol = symbol.strip().upper()

    if not force_refresh:
        cached = _get_from_cache(clean_symbol)
        if cached:
            return cached

    # Reale Fundamentaldaten aus bestehendem Service beziehen
    quote = await get_stock_quote(clean_symbol)
    if not quote:
        raise ValueError(f"Keine Kursdaten für '{clean_symbol}' gefunden.")

    system_instruction = (
        "Du bist ein institutioneller Finanzanalyst für StockPulse. "
        "Erstelle eine objektive, datengestützte Bull- vs. Bear-Analyse. "
        "Verwende ausschließlich reale Kennzahlen aus dem Kontext (KGV, Marktkapitalisierung, 52W-Spanne). "
        "Formuliere neutral und sachlich (keine Kauf-/Verkaufsempfehlungen wie 'Jetzt kaufen'). "
        "Output MUSS strikt als valides JSON formatiert sein und dem Schema entsprechen."
    )

    prompt = f"""
    Analysiere folgendes Wertpapier:
    - Symbol: {clean_symbol}
    - Name: {quote.name or quote.shortName or clean_symbol}
    - Aktueller Kurs: {quote.currentPrice} {quote.currency}
    - KGV (Trailing / Forward): {quote.trailingPE or 'N/A'} / {quote.forwardPE or 'N/A'}
    - 52-Wochen Spanne: {quote.fiftyTwoWeekLow} – {quote.fiftyTwoWeekHigh} {quote.currency}
    - Marktkapitalisierung: {quote.marketCap or 'N/A'}
    - Analysten-Konsens: {quote.recommendationKey or 'N/A'}

    Erstelle genau 3 bis 4 präzise Bull-Punkte (Wachstumspotenziale, Burggraben) 
    und genau 3 bis 4 Bear-Punkte (Bewertungsrisiken, Zinsrisiken, Wettbewerbsdruck).
    """

    is_custom_key = bool(user and user.encrypted_gemini_key)
    client = get_genai_client(user=user, db=db) if user else genai.Client(api_key=settings.GEMINI_API_KEY)
    model_name = getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=BullBearAnalysis,
                    temperature=0.2,
                ),
            )
            parsed = BullBearAnalysis.model_validate_json(response.text)
            parsed.generated_at = datetime.now(timezone.utc).isoformat()
            _save_to_cache(clean_symbol, parsed)
            return parsed
        except HTTPException:
            raise
        except Exception as e:
            if ("503" in str(e) or "UNAVAILABLE" in str(e)) and attempt < 2:
                await asyncio.sleep(2.0 * (attempt + 1))
                continue
            handle_genai_exception(e, is_custom_key=is_custom_key)
            raise e