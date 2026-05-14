import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from fastapi.testclient import TestClient
from src.api import app

client = TestClient(app)

def _mock_hist():
    idx = pd.to_datetime(['2026-01-02', '2026-01-03'])
    df = pd.DataFrame({
        'Open':   [35.0, 36.0],
        'High':   [36.5, 37.0],
        'Low':    [34.5, 35.5],
        'Close':  [36.0, 36.8],
        'Volume': [1000000, 1200000],
    }, index=idx)
    df.index.name = 'Date'
    return df

def test_chart_returns_ohlcv():
    mock_ticker = MagicMock()
    mock_ticker.history.return_value = _mock_hist()
    with patch('src.api.yf.Ticker', return_value=mock_ticker):
        r = client.get('/chart/PETR4.SA?period=1mo&interval=1d')
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert set(data[0].keys()) == {'time', 'open', 'high', 'low', 'close', 'volume'}
    assert data[0]['close'] == 36.0

def test_chart_default_params():
    mock_ticker = MagicMock()
    mock_ticker.history.return_value = _mock_hist()
    with patch('src.api.yf.Ticker', return_value=mock_ticker):
        r = client.get('/chart/PETR4.SA')
    mock_ticker.history.assert_called_once_with(period='3mo', interval='1d')
    assert r.status_code == 200
