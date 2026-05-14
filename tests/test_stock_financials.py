import pytest
from unittest.mock import MagicMock, patch
import pandas as pd
from fastapi.testclient import TestClient
from src.api import app


def make_ticker():
    t = MagicMock()
    fi = MagicMock(); fi.market_cap = 1.18e11
    t.fast_info = fi
    t.info = {
        "totalDebt": 1.07e12, "totalCash": 1.4e11,
        "minorityInterest": 4.4e9, "enterpriseValue": 1.05e12,
        "trailingPE": 8.65, "priceToSalesTrailing12Months": 0.81,
        "priceToBook": 1.2, "enterpriseToEbitda": 6.5,
        "totalRevenue": 1.46e11, "netIncomeToCommon": 1.37e10,
        "returnOnEquity": 0.198, "returnOnAssets": 0.0142,
        "profitMargins": 0.094, "operatingMargins": 0.221,
        "dividendRate": 3.91, "dividendYield": 4.16,
    }
    rev = pd.DataFrame(
        {pd.Timestamp(f"{y}-12-31"): {"Total Revenue": v}
         for y, v in [(2021,9.2e10),(2022,1.1e11),(2023,1.25e11),(2024,1.4e11),(2025,1.46e11)]}
    ).T.T
    t.financials = rev
    t.balance_sheet = pd.DataFrame()
    t.dividends = pd.Series(dtype=float)
    t.earnings_history = pd.DataFrame()
    t.calendar = {}
    return t


@patch("src.stock_service.yf.Ticker")
def test_financials_shape(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    mock_ticker.return_value = make_ticker()
    with TestClient(app) as client:
        r = client.get("/stock/PETR4/financials")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "facts" in data and "capital_structure" in data
    assert "valuation" in data and "growth" in data
    assert "profitability" in data and "dividends_history" in data
    assert "financial_health" in data and "estimates" in data
