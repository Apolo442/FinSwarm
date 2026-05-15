from unittest.mock import patch, MagicMock
import pandas as pd
from fastapi.testclient import TestClient
from src.api import app


@patch("src.stock_service.yf.Ticker")
def test_forecast_endpoint(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    t = MagicMock()
    t.fast_info = MagicMock(last_price=45.13, previous_close=44.5,
                            last_volume=1e6, market_cap=6e11, currency="BRL")
    t.analyst_price_targets = {"current": 45.07, "high": 65.0, "low": 43.0,
                                "mean": 53.225, "median": 49.85}
    t.recommendations = pd.DataFrame([
        {"period": "0m", "strongBuy": 4, "buy": 6, "hold": 4, "sell": 0, "strongSell": 0}
    ])
    t.earnings_history = pd.DataFrame()
    mock_ticker.return_value = t
    with TestClient(app) as client:
        r = client.get("/stock/PETR4/forecast")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["price_target"]["target_mean"] == 53.225
    assert data["recommendations"]["strong_buy"] == 4
    assert data["recommendations"]["buy"] == 6
