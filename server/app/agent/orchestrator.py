import os
from .tools.financial_tools import (
    calculate_technical_indicators,
    get_stock_fundamentals,
)

AVAILABLE_TOOLS = [get_stock_fundamentals, calculate_technical_indicators]
from app.core.config import settings
from google import genai
from google.genai import types

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
    self.client = genai.Client(api_key=api_key)
    self.model_name = "gemini-3.6-flash"

  def run(self, user_prompt: str) -> dict:
    """Führt den ReAct-Loop aus.

    Das SDK kümmert sich automatisch um den Aufruf der Tools aus
    AVAILABLE_TOOLS.
    """
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        tools=AVAILABLE_TOOLS,
        temperature=0.2,  # Niedrige Temperatur für deterministischere Analysen
    )

    response = self.client.models.generate_content(
        model=self.model_name, contents=user_prompt, config=config
    )

    return {
        "prompt": user_prompt,
        "analysis": response.text,
    }


financial_agent = FinancialAgent()