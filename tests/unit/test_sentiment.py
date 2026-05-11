import pytest
from unittest.mock import AsyncMock
from src.agents.sentiment import SentimentAgent
from src.data.news import NewsData
from src.models import AgentOutput
import json


def _news_data():
    return NewsData(ticker="PETR4", headlines=[
        "Petrobras anuncia dividendos recordes",
        "PETR4 sobe 4% após resultado positivo",
        "Analistas elevam preço-alvo de Petrobras",
    ])


@pytest.mark.asyncio
async def test_sentiment_agent_returns_ok_output(mock_llm):
    response = json.dumps({
        "score": 0.72,
        "label": "POSITIVO",
        "catalysts": ["Dividendos recordes", "Elevação de preço-alvo"],
        "risks": [],
        "summary": "Sentimento positivo com catalisadores fortes de curto prazo.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = SentimentAgent(llm=mock_llm)
    result = await agent.run(news=_news_data())

    assert result.status == "ok"
    assert result.raw["score"] == 0.72
    assert result.raw["label"] == "POSITIVO"


@pytest.mark.asyncio
async def test_sentiment_agent_with_empty_news(mock_llm):
    response = json.dumps({
        "score": 0.0, "label": "NEUTRO", "catalysts": [], "risks": [],
        "summary": "Sem notícias relevantes no período.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = SentimentAgent(llm=mock_llm)
    result = await agent.run(news=NewsData(ticker="PETR4", headlines=[]))
    assert result.status == "ok"
