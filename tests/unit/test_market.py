import pandas as pd
import pytest
from unittest.mock import MagicMock, patch
from src.data.market import MarketData, fetch_market_data


def _make_hist():
    dates = pd.date_range("2025-01-01", periods=60, freq="B")
    return pd.DataFrame({
        "Close": [50.0 + i * 0.1 for i in range(60)],
        "Volume": [1_000_000] * 60,
    }, index=dates)


@patch("src.data.market.yf.Ticker")
def test_fetch_market_data_returns_market_data(mock_ticker_cls):
    mock_ticker = MagicMock()
    mock_ticker.history.return_value = _make_hist()
    mock_ticker.info = {"shortName": "Petrobras", "sector": "Energy"}
    mock_ticker_cls.return_value = mock_ticker

    result = fetch_market_data("PETR4.SA")

    assert isinstance(result, MarketData)
    assert result.ticker == "PETR4.SA"
    assert isinstance(result.rsi, float)
    assert isinstance(result.macd, float)
    assert isinstance(result.bb_upper, float)
    assert result.price > 0


@patch("src.data.market.yf.Ticker")
def test_fetch_market_data_rsi_in_valid_range(mock_ticker_cls):
    mock_ticker = MagicMock()
    mock_ticker.history.return_value = _make_hist()
    mock_ticker.info = {}
    mock_ticker_cls.return_value = mock_ticker

    result = fetch_market_data("PETR4.SA")
    assert 0 <= result.rsi <= 100
