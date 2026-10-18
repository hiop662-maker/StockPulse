import pytest
from unittest.mock import AsyncMock, patch, ANY
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.ai import BullBearAnalysis
from app.services.bull_bear_service import clear_bull_bear_cache

client = TestClient(app)

MOCK_ANALYSIS_DATA = {
    "symbol": "NVDA",
    "company_name": "NVIDIA Corporation",
    "summary": "NVIDIA dominiert den KI-Beschleunigermarkt mit soliden Margen.",
    "risk_level": "Moderat",
    "bull_points": [
        "Hohe Preissetzungsmacht und dominante Marktstellung bei Rechenzentren.",
        "Starkes Umsatzwachstum getrieben durch Enterprise AI.",
        "Robuste Bruttomarge über dem Branchendurchschnitt.",
    ],
    "bear_points": [
        "Sehr anspruchsvolle Bewertung mit erhöhtem Korrekturbedarf bei Zielverfehlungen.",
        "Geopolitische Risiken und Exportbeschränkungen nach Asien.",
        "Zunehmende Eigenchip-Entwicklungen großer Cloud-Kunden.",
    ],
    "disclaimer": "Keine Anlageberatung. Dient ausschließlich Informations- und Analysezwecken.",
    "generated_at": "2026-10-11T14:30:00+00:00",
}


@pytest.fixture(autouse=True)
def reset_cache():
    clear_bull_bear_cache()
    yield
    clear_bull_bear_cache()


def test_bull_bear_missing_body():
    """Fehlender Body muss 422 Unprocessable Entity werfen."""
    response = client.post("/api/ai/bull-bear", json={})
    assert response.status_code == 422


@patch("app.api.ai.generate_bull_bear_analysis", new_callable=AsyncMock)
def test_bull_bear_success_default_cache(mock_generate):
    """Erfolgreicher Aufruf mit Default force_refresh=False und Prüfung von generated_at."""
    mock_generate.return_value = BullBearAnalysis(**MOCK_ANALYSIS_DATA)

    response = client.post("/api/ai/bull-bear", json={"symbol": "NVDA"})

    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "NVDA"
    assert data["company_name"] == "NVIDIA Corporation"
    assert data["risk_level"] == "Moderat"
    assert len(data["bull_points"]) == 3
    assert len(data["bear_points"]) == 3
    assert "disclaimer" in data
    assert "generated_at" in data
    mock_generate.assert_called_once_with("NVDA", force_refresh=False, user=None, db=ANY)


@patch("app.api.ai.generate_bull_bear_analysis", new_callable=AsyncMock)
def test_bull_bear_force_refresh_flag(mock_generate):
    """Prüft, ob force_refresh=True korrekt an den Service durchgereicht wird."""
    mock_generate.return_value = BullBearAnalysis(**MOCK_ANALYSIS_DATA)

    response = client.post(
        "/api/ai/bull-bear",
        json={"symbol": "NVDA", "force_refresh": True},
    )

    assert response.status_code == 200
    mock_generate.assert_called_once_with("NVDA", force_refresh=True, user=None, db=ANY)


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