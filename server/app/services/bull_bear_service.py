import asyncio
import time
from typing import Any, Dict, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.ai import BullBearAnalysis
from app.api.stocks import get_stock_quote

# 6 Stunden TTL Cache: { "TICKER": { "data": BullBearAnalysis, "expires_at": float } }
_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 6 * 60 * 60


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


async def generate_bull_bear_analysis(symbol: str) -> BullBearAnalysis:
    clean_symbol = symbol.strip().upper()
    cached = _get_from_cache(clean_symbol)
    if cached:
        return cached

    # Reale Fundamentaldaten aus bestehendem Service beziehen (Anti-Halluzination)
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
    - 52-Wochen Spanne: {quote.fiftyTwoWeekLow} - {quote.fiftyTwoWeekHigh} {quote.currency}
    - Marktkapitalisierung: {quote.marketCap or 'N/A'}
    - Analysten-Konsens: {quote.recommendationKey or 'N/A'}

    Erstelle genau 3 bis 4 präzise Bull-Punkte (Wachstumspotenziale, Burggraben) 
    und genau 3 bis 4 Bear-Punkte (Bewertungsrisiken, Zinsrisiken, Wettbewerbsdruck).
    """

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    model_name = getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")

    # Bis zu 3 Versuche bei temporären 503-Überlastungen
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
            _save_to_cache(clean_symbol, parsed)
            return parsed
        except Exception as e:
            if ("503" in str(e) or "UNAVAILABLE" in str(e)) and attempt < 2:
                await asyncio.sleep(2.0 * (attempt + 1))
                continue
            raise e