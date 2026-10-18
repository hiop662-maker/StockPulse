from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "StockPulse AI API"
    API_V1_STR: str = "/api"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    GEMINI_API_KEY: str = ""
    ENCRYPTION_SECRET_KEY: str = ""

    # Erlaubt zusätzliche Felder aus .env und liest die Datei automatisch ein
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()