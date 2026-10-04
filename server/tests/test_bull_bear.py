import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.ai import BullBearAnalysis

client = TestClient(app)

MOCK_ANALYSIS_DATA = {
    "symbol": "NVDA",
    "company_name": "NVIDIA Corporation",
    "summary": "NVIDIA dominiert den KI-Beschleunigermarkt mit soliden Margen.",
    "risk_level": "Moderat",
    "bull_points": [
        "Hohe Preissetzungsmacht und dominante Marktstellung bei Rechenzentren.",
        "Starkes Umsatzwachstum getrieben durch Enterprise AI.",
        "Robuste Bruttomarge über dem Branchendurchschnitt."
    ],
    "bear_points": [
        "Sehr anspruchsvolle Bewertung mit erhöhtem Korrekturbedarf bei Zielverfehlungen.",
        "Geopolitische Risiken und Exportbeschränkungen nach Asien.",
        "Zunehmende Eigenchip-Entwicklungen großer Cloud-Kunden."
    ],
    "disclaimer": "Keine Anlageberatung. Dient ausschließlich Informations- und Analysezwecken."
}

def test_bull_bear_missing_body():
    """Fehlender Body muss 422 Unprocessable Entity werfen."""
    response = client.post("/api/ai/bull-bear", json={})
    assert response.status_code == 422

@patch("app.api.ai.generate_bull_bear_analysis", new_callable=AsyncMock)
def test_bull_bear_success(mock_generate):
    """Erfolgreicher Aufruf mit validiertem Pydantic-Schema."""
    mock_generate.return_value = BullBearAnalysis(**MOCK_ANALYSIS_DATA)

    response = client.post("/api/ai/bull-bear", json={"symbol": "NVDA"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "NVDA"
    assert data["risk_level"] == "Moderat"
    assert len(data["bull_points"]) == 3
    assert len(data["bear_points"]) == 3
    assert "disclaimer" in data

@patch("app.api.ai.generate_bull_bear_analysis", new_callable=AsyncMock)
def test_bull_bear_not_found(mock_generate):
    """Nicht gefundener Ticker muss HTTP 404 liefern."""
    mock_generate.side_effect = ValueError("Keine Kursdaten für 'INVALID' gefunden.")

    response = client.post("/api/ai/bull-bear", json={"symbol": "INVALID"})
    assert response.status_code == 404
    assert "Keine Kursdaten" in response.json()["detail"]

@patch("app.api.ai.generate_bull_bear_analysis", new_callable=AsyncMock)
def test_bull_bear_service_failure(mock_generate):
    """Unerwartete API-Fehler müssen HTTP 502 liefern."""
    mock_generate.side_effect = RuntimeError("LLM Timeout")

    response = client.post("/api/ai/bull-bear", json={"symbol": "NVDA"})
    assert response.status_code == 502
    assert "Fehler bei der KI-Analyse" in response.json()["detail"]