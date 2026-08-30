import os
from pathlib import Path
from typing import AsyncGenerator
from dotenv import load_dotenv
from google import genai
from google.genai import types

env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

class AiAdvisorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def _get_chat_setup(self, symbol: str, history: list[dict] = None):
        if not self.client:
            self.api_key = os.getenv("GEMINI_API_KEY")
            if self.api_key:
                self.client = genai.Client(api_key=self.api_key)
            else:
                return None, None

        system_instruction = (
            f"Du bist ein professioneller, sachlicher Finanzanalyst für die Aktie '{symbol}'. "
            "Gib präzise, strukturierte und fundierte Einschätzungen auf Deutsch. "
            "Nutze Aufzählungspunkte für Lesbarkeit und weise bei Bedarf kurz darauf hin, "
            "dass dies keine Anlageberatung darstellt."
        )

        chat_history = []
        if history:
            for msg in history:
                role = "user" if msg.get("role") == "user" else "model"
                chat_history.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg.get("content", ""))],
                    )
                )

        chat = self.client.chats.create(
            model="gemini-3.6-flash",
            history=chat_history,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
            ),
        )
        return chat, None

    def analyze_stock(self, symbol: str, question: str, history: list[dict] = None) -> str:
        chat, error = self._get_chat_setup(symbol, history)
        if not chat:
            return "Fehler: Kein GEMINI_API_KEY in der Server-.env konfiguriert."

        try:
            response = chat.send_message(question)
            return response.text or "Keine Antwort erhalten."
        except Exception as e:
            return f"Fehler bei der KI-Generierung: {str(e)}"

    async def stream_stock_analysis(self, symbol: str, question: str, history: list[dict] = None):
        chat, _ = self._get_chat_setup(symbol, history)
        if not chat:
            yield "data: Fehler: Kein GEMINI_API_KEY in der Server-.env konfiguriert.\n\n"
            return

        try:
            response_stream = chat.send_message_stream(question)
            for chunk in response_stream:
                if chunk.text:
                    # SSE Datenzeilen escapen (Newlines maskieren)
                    safe_text = chunk.text.replace("\r", "")
                    yield f"data: {safe_text}\n\n"
        except Exception as e:
            yield f"data: Fehler beim Streaming: {str(e)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

ai_service = AiAdvisorService()