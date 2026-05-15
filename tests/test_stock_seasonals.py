from unittest.mock import patch, MagicMock
import pandas as pd, numpy as np
from fastapi.testclient import TestClient
from src.api import app


@patch("src.stock_service.yf.Ticker")
def test_seasonals_endpoint(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    # Create monthly data from 2021-01-31 to 2025-12-31
    idx = pd.date_range("2021-01-31", "2025-12-31", freq="ME")
    np.random.seed(0)
    prices = np.random.uniform(20, 30, len(idx))
    df = pd.DataFrame({"Close": prices}, index=idx)
    t = MagicMock(); t.history.return_value = df
    mock_ticker.return_value = t
    with TestClient(app) as client:
        r = client.get("/stock/PETR4/seasonals")
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["monthly_avg_5y"]) == 12
    assert len(data["years"]) >= 4
