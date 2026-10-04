import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.bull_bear_service import generate_bull_bear_analysis, _CACHE
from app.schemas.ai import BullBearAnalysis

@pytest.fixture(autouse=True)
def clear_service_cache():
    _CACHE.clear()
    yield
    _CACHE.clear()

@pytest.mark.asyncio
@patch("app.services.bull_bear_service.get_stock_quote", new_callable=AsyncMock)
@patch("app.services.bull_bear_service.genai.Client")
async def test_bull_bear_caching(mock_genai_client, mock_quote):
    # Mock Quote
    quote_mock = MagicMock()
    quote_mock.name = "Apple Inc."
    quote_mock.shortName = "Apple"
    quote_mock.currentPrice = 220.0
    quote_mock.currency = "USD"
    quote_mock.trailingPE = 32.0
    quote_mock.forwardPE = 28.0
    quote_mock.fiftyTwoWeekLow = 165.0
    quote_mock.fiftyTwoWeekHigh = 237.0
    quote_mock.marketCap = 3400000000000
    quote_mock.recommendationKey = "buy"
    mock_quote.return_value = quote_mock

    # Mock Gemini Response
    mock_response = MagicMock()
    mock_response.text = BullBearAnalysis(
        symbol="AAPL",
        company_name="Apple Inc.",
        summary="Stabile Margen durch Services-Segment.",
        risk_level="Niedrig",
        bull_points=["Ökosystem-Lock-in", "Hoher Free Cashflow", "Stetige Aktienrückkäufe"],
        bear_points=["Verlangsamtes Hardware-Wachstum", "Regulatorischer Druck auf App Store", "Hohe Bewertung"],
        disclaimer="Keine Anlageberatung."
    ).model_dump_json()

    instance = mock_genai_client.return_value
    instance.models.generate_content.return_value = mock_response

    # Erster Aufruf -> Ruft LLM auf
    result1 = await generate_bull_bear_analysis("AAPL")
    assert result1.symbol == "AAPL"
    assert instance.models.generate_content.call_count == 1

    # Zweiter Aufruf -> Liest aus Cache, KEIN erneuter LLM-Aufruf
    result2 = await generate_bull_bear_analysis("AAPL")
    assert result2.symbol == "AAPL"
    assert instance.models.generate_content.call_count == 1