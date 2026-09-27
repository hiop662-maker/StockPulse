# server/tests/test_watchlist.py
from unittest.mock import patch
import pandas as pd
from fastapi import status


def test_get_watchlist_unauthorized(client):
    response = client.get("/api/watchlist")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_add_and_get_watchlist(client, auth_headers):
    # 1. Ticker hinzufügen
    post_res = client.post("/api/watchlist/NVDA", headers=auth_headers)
    assert post_res.status_code == status.HTTP_200_OK
    assert post_res.json()["symbol"] == "NVDA"

    # 2. Watchlist abrufen
    get_res = client.get("/api/watchlist", headers=auth_headers)
    assert get_res.status_code == status.HTTP_200_OK
    items = get_res.json()
    assert len(items) == 1
    assert items[0]["symbol"] == "NVDA"


def test_remove_from_watchlist(client, auth_headers):
    client.post("/api/watchlist/AAPL", headers=auth_headers)
    del_res = client.delete("/api/watchlist/AAPL", headers=auth_headers)
    assert del_res.status_code == status.HTTP_200_OK

    get_res = client.get("/api/watchlist", headers=auth_headers)
    assert len(get_res.json()) == 0


@patch("yfinance.Ticker")
def test_watchlist_summary_mocked(mock_ticker, client, auth_headers):
    # Mock für yfinance History & Info
    mock_instance = mock_ticker.return_value
    mock_instance.history.return_value = pd.DataFrame(
        {"Close": [100.0, 102.5, 105.0]}
    )
    mock_instance.fast_info.currency = "USD"
    mock_instance.info = {"shortName": "NVIDIA Corporation"}

    # Item hinzufügen
    client.post("/api/watchlist/NVDA", headers=auth_headers)

    res = client.get("/api/watchlist/summary", headers=auth_headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert len(data) == 1
    assert data[0]["symbol"] == "NVDA"
    assert data[0]["current_price"] == 105.0
    assert len(data[0]["sparkline_1mo"]) == 3

def test_add_duplicate_symbol_does_not_duplicate_items(client, auth_headers):
    # 1. Erstes Hinzufügen
    res1 = client.post("/api/watchlist/MSFT", headers=auth_headers)
    assert res1.status_code == status.HTTP_200_OK

    # 2. Zweites Hinzufügen desselben Tickers
    res2 = client.post("/api/watchlist/MSFT", headers=auth_headers)
    assert res2.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    # 3. Sicherstellen, dass der Eintrag in der Watchlist nur 1x vorkommt
    get_res = client.get("/api/watchlist", headers=auth_headers)
    items = get_res.json()
    assert len([item for item in items if item["symbol"] == "MSFT"]) == 1