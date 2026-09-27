from unittest.mock import patch
from fastapi import status


@patch("yfinance.Ticker")
def test_stock_quote_not_found(mock_ticker, client):
    # Simuliere leere yfinance-Daten für ein ungültiges Symbol
    mock_instance = mock_ticker.return_value
    mock_instance.fast_info.last_price = None
    mock_instance.info = {}

    response = client.get("/api/stocks/INVALIDTICKER123/quote")
    # API liefert 404 Not Found oder 400 Bad Request
    assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST]