from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from src.api import app


@patch("src.stock_service.classify_titles", new_callable=AsyncMock)
@patch("src.stock_service.fetch_news")
@patch("src.stock_service.yf.Ticker")
def test_news_endpoint(mock_ticker, mock_gnews, mock_sent, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    mock_ticker.return_value = MagicMock(news=[])
    mock_gnews.return_value = MagicMock(
        ticker="PETR4.SA",
        headlines=["BB sobe forte", "Receita cai", "Resultado estável"],
    )
    mock_sent.return_value = ["POS", "NEG", "NEU"]
    with TestClient(app) as client:
        r = client.get("/stock/PETR4/news")
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert len(items) == 3
    assert items[0]["sentiment"] == "POS"
    assert items[1]["sentiment"] == "NEG"
