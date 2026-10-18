import os
from typing import Optional
from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User
from app.services.genai_client import get_genai_client, handle_genai_exception
from .tools.financial_tools import (
    calculate_technical_indicators,
    get_stock_fundamentals,
)

AVAILABLE_TOOLS = [get_stock_fundamentals, calculate_technical_indicators]

SYSTEM_INSTRUCTION = """
Du bist ein präziser, analytischer Finanz- und Investment-Assistent für ein Aktien-/ETF-Dashboard.
Deine Aufgabe ist es, fundierte Analysen auf Basis von Echtzeitdaten und technischen Indikatoren bereitzustellen.

Verhaltensregeln:
1. Nutze IMMER die bereitgestellten Tools, um aktuelle Kursdaten, Fundamentaldaten oder technische Indikatoren abzufragen, bevor du eine Einschätzung abgibst.
2. Wenn der Nutzer nach einer Aktie fragt, hole sowohl Fundamentaldaten als auch technische Indikatoren ein.
3. Beziehe dich explizit auf konkrete Zahlen (z. B. "Der RSI(14) liegt bei 68, was auf ein leicht überkauftes Niveau hindeutet").
4. Formuliere deine Einschätzung ausgewogen mit Chancen und Risiken. 
5. Gib keinen blinden Kaufbefehl, sondern schließe stets mit einer sachlichen Zusammenfassung und dem Hinweis ab, dass dies keine Anlageberatung darstellt.
"""


class FinancialAgent:
    def __init__(self):
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.model_name = "gemini-3.6-flash"

    def run(
        self,
        user_prompt: str,
        user: Optional[User] = None,
        db: Optional[Session] = None,
    ) -> dict:
        is_custom_key = bool(user and user.encrypted_gemini_key)
        client = get_genai_client(user=user, db=db) if user else self.client
        if not client:
            client = get_genai_client(user=None, db=db)

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=AVAILABLE_TOOLS,
            temperature=0.2,
        )

        try:
            response = client.models.generate_content(
                model=self.model_name, contents=user_prompt, config=config
            )
            return {
                "prompt": user_prompt,
                "analysis": response.text,
            }
        except Exception as exc:
            handle_genai_exception(exc, is_custom_key=is_custom_key)
            raise exc


financial_agent = FinancialAgent()