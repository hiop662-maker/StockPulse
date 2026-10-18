import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from fastapi import HTTPException
from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from app.db.models import User
from app.services.genai_client import get_genai_client, handle_genai_exception

env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)


class AiAdvisorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def _get_chat_setup(
        self,
        symbol: str,
        history: list[dict] = None,
        user: Optional[User] = None,
        db: Optional[Session] = None,
    ):
        client = None
        if user is not None:
            client = get_genai_client(user=user, db=db)
        else:
            if not self.client:
                self.api_key = os.getenv("GEMINI_API_KEY")
                if self.api_key:
                    self.client = genai.Client(api_key=self.api_key)
            client = self.client

        if not client:
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

        chat = client.chats.create(
            model="gemini-3.6-flash",
            history=chat_history,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
            ),
        )
        return chat, None

    def analyze_stock(
        self,
        symbol: str,
        question: str,
        history: list[dict] = None,
        user: Optional[User] = None,
        db: Optional[Session] = None,
    ) -> str:
        is_custom_key = bool(user and user.encrypted_gemini_key)
        chat, _ = self._get_chat_setup(symbol, history, user=user, db=db)
        if not chat:
            return "Fehler: Kein GEMINI_API_KEY hinterlegt."

        try:
            response = chat.send_message(question)
            return response.text or "Keine Antwort erhalten."
        except HTTPException:
            raise
        except Exception as e:
            handle_genai_exception(e, is_custom_key=is_custom_key)
            return f"Fehler bei der KI-Generierung: {str(e)}"

    async def stream_stock_analysis(
        self,
        symbol: str,
        question: str,
        history: list[dict] = None,
        user: Optional[User] = None,
        db: Optional[Session] = None,
    ):
        is_custom_key = bool(user and user.encrypted_gemini_key)
        try:
            chat, _ = self._get_chat_setup(symbol, history, user=user, db=db)
        except HTTPException as exc:
            yield f"data: Fehler: {exc.detail}\n\n"
            yield "data: [DONE]\n\n"
            return

        if not chat:
            yield "data: Fehler: Kein GEMINI_API_KEY hinterlegt.\n\n"
            yield "data: [DONE]\n\n"
            return

        try:
            response_stream = chat.send_message_stream(question)
            for chunk in response_stream:
                if chunk.text:
                    safe_text = chunk.text.replace("\r", "")
                    yield f"data: {safe_text}\n\n"
        except Exception as e:
            try:
                handle_genai_exception(e, is_custom_key=is_custom_key)
            except HTTPException as http_exc:
                yield f"data: Fehler: {http_exc.detail}\n\n"
                return
            yield f"data: Fehler beim Streaming: {str(e)}\n\n"
        finally:
            yield "data: [DONE]\n\n"


ai_service = AiAdvisorService()