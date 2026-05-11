import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.data.news import fetch_news, NewsData


@pytest.mark.asyncio
@patch("src.data.news.httpx.AsyncClient")
async def test_fetch_news_returns_news_data(mock_client_cls):
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_client

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "articles": [
            {"title": "Petrobras sobe 3% após balanço", "publishedAt": "2026-05-10T12:00:00Z"},
            {"title": "Análise: PETR4 com potencial de alta", "publishedAt": "2026-05-09T08:00:00Z"},
        ]
    }
    mock_client.get = AsyncMock(return_value=mock_resp)

    import os
    with patch.dict(os.environ, {"GNEWS_API_KEY": "test-key"}):
        result = await fetch_news("PETR4", "Petrobras")

    assert isinstance(result, NewsData)
    assert len(result.headlines) == 2
    assert "Petrobras sobe" in result.headlines[0]


@pytest.mark.asyncio
@patch("src.data.news.httpx.AsyncClient")
async def test_fetch_news_handles_api_error_gracefully(mock_client_cls):
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_client
    mock_client.get = AsyncMock(side_effect=Exception("timeout"))

    result = await fetch_news("PETR4", "Petrobras")
    assert isinstance(result, NewsData)
    assert result.headlines == []
