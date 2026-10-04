from typing import List, Literal
from pydantic import BaseModel, Field


class BullBearRequest(BaseModel):
    symbol: str = Field(..., description="Aktien-Ticker, z. B. NVDA oder AAPL")


class BullBearAnalysis(BaseModel):
    symbol: str = Field(..., description="Ticker-Symbol")
    company_name: str = Field(..., description="Offizieller Unternehmensname")
    summary: str = Field(
        ...,
        description="Neutrale, 2-3 Sätze lange Markteinschätzung auf Basis der Kennzahlen.",
    )
    risk_level: Literal["Niedrig", "Moderat", "Erhöht", "Hoch"] = Field(
        ..., description="Eingeschätztes Risikoprofil"
    )
    bull_points: List[str] = Field(
        ...,
        min_length=3,
        max_length=4,
        description="3-4 prägnante, datengestützte Chancen und Wachstumstreiber.",
    )
    bear_points: List[str] = Field(
        ...,
        min_length=3,
        max_length=4,
        description="3-4 fundamentale Risiken, Gegenwinde oder Bewertungsbedenken.",
    )
    disclaimer: str = Field(
        default="Keine Anlageberatung. Dient ausschließlich Informations- und Analysezwecken.",
        description="Pflicht-Disclaimer",
    )