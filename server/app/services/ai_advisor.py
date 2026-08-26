import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Lädt die .env-Datei aus dem Server-Hauptverzeichnis
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

class AiAdvisorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def analyze_stock(self, symbol: str, question: str, history: list[dict] = None) -> str:
        if not self.client:
            self.api_key = os.getenv("GEMINI_API_KEY")
            if self.api_key:
                self.client = genai.Client(api_key=self.api_key)
            else:
                return "Fehler: Kein GEMINI_API_KEY in der Server-.env konfiguriert."

        system_instruction = (
            f"Du bist ein professioneller, sachlicher Finanzanalyst für die Aktie '{symbol}'. "
            "Gib präzise, strukturierte und fundierte Einschätzungen auf Deutsch. "
            "Nutze Aufzählungspunkte für Lesbarkeit und weise bei Bedarf kurz darauf hin, "
            "dass dies keine Anlageberatung darstellt."
        )

        # Chat-Historie formatieren
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

        try:
            # Empfohlener Chat-Client via chats.create
            chat = self.client.chats.create(
                model="gemini-3.6-flash",
                history=chat_history,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.4,
                ),
            )
            response = chat.send_message(question)
            return response.text or "Keine Antwort erhalten."
        except Exception as e:
            return f"Fehler bei der KI-Generierung: {str(e)}"

ai_service = AiAdvisorService()