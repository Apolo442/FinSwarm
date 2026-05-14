import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pandas as pd
from src.api import app


def make_fake_ticker():
    t = MagicMock()
    fi = MagicMock()
    fi.last_price = 45.13; fi.previous_close = 44.48
    fi.last_volume = 36_000_000; fi.market_cap = 6.17e11
    fi.currency = "BRL"
    t.fast_info = fi
    t.info = {
        "longBusinessSummary": "Petroleo Brasileiro...",
        "trailingPE": 6.04, "priceToBook": 1.4,
        "dividendYield": 8.66, "shortName": "PETROBRAS PN",
        "longName": "Petroleo Brasileiro S.A.",
        "fullTimeEmployees": 45000,
        "city": "Rio", "country": "Brazil",
        "website": "https://petrobras.com.br",
        "sector": "Energy", "industry": "Oil & Gas",
        "beta": 1.2, "trailingEps": 7.18,
    }
    n = 260
    idx = pd.date_range("2025-05-01", periods=n, freq="D")
    t.history = MagicMock(return_value=pd.DataFrame({
        "Open":   [40+i*0.02 for i in range(n)],
        "High":   [42+i*0.02 for i in range(n)],
        "Low":    [39+i*0.02 for i in range(n)],
        "Close":  [41+i*0.02 for i in range(n)],
        "Volume":[1e6]*n,
    }, index=idx))
    t.major_holders = pd.DataFrame({"Value": ["50.39%", "49.61%"]},
                                    index=["% of Shares Held by Insiders", "% of Shares Held by Institutions"])
    t.news = []
    return t


@patch("src.stock_service.yf.Ticker")
def test_overview_shape(mock_ticker, tmp_path, monkeypatch):
    db_path = str(tmp_path / "c.db")
    monkeypatch.setattr("src.cache._DB_PATH", db_path)
    mock_ticker.return_value = make_fake_ticker()
    with TestClient(app) as client:
        r = client.get("/stock/PETR4/overview")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ticker"].endswith("PETR4.SA") or "PETR4" in data["ticker"]
    assert "quote" in data and data["quote"]["price"] == 45.13
    assert "profile" in data
    assert "kpis" in data
    assert "seasonals_mini" in data and len(data["seasonals_mini"]) <= 12
    assert "technicals_summary" in data
    assert "forecast_summary" in data
