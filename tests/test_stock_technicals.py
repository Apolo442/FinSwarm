from unittest.mock import patch, MagicMock
import pandas as pd, numpy as np
from fastapi.testclient import TestClient
from src.api import app


@patch("src.stock_service.yf.Ticker")
def test_technicals_endpoint(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    np.random.seed(1); n = 260
    idx = pd.date_range("2025-01-01", periods=n, freq="D")
    df = pd.DataFrame({
        "Open": np.random.uniform(20, 25, n), "High": np.random.uniform(20, 26, n),
        "Low": np.random.uniform(18, 21, n),  "Close": np.random.uniform(19, 25, n),
        "Volume": np.random.randint(1000000, 10000000, n),
    }, index=idx)
    t = MagicMock()
    t.history.return_value = df
    # Mock fast_info to avoid breaking other tests
    fi = MagicMock()
    fi.last_price = 22.5; fi.previous_close = 22.0; fi.last_volume = 5000000
    fi.market_cap = 1e11; fi.currency = "BRL"
    t.fast_info = fi
    t.info = {"shortName": "TEST", "longName": "Test Corp"}
    t.news = []
    mock_ticker.return_value = t
    with TestClient(app) as client:
        r = client.get("/stock/PETR4/technicals")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["summary"]["signal"] in ("STRONG_BUY","BUY","NEUTRAL","SELL","STRONG_SELL")
    assert len(data["oscillators"]) >= 5
    assert len(data["moving_averages"]) >= 5
    assert len(data["pivots"]) == 5
