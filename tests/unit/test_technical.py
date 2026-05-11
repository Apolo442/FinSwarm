import pytest
from unittest.mock import AsyncMock
from src.agents.technical import TechnicalAgent
from src.data.market import MarketData
from src.models import AgentOutput
import json


def _market_data():
    return MarketData(
        ticker="PETR4.SA", price=38.50, pct_20d=2.3, volume_avg_20d=45_000_000,
        rsi=58.2, macd=0.12, macd_signal=0.08, macd_hist=0.04,
        bb_upper=40.0, bb_mid=37.0, bb_lower=34.0,
        name="Petrobras", sector="Energy",
    )


@pytest.mark.asyncio
async def test_technical_agent_returns_ok_output(mock_llm):
    response = json.dumps({
        "signal": "ALTA",
        "rsi_interpretation": "RSI em zona neutra, sem sobrecompra.",
        "macd_interpretation": "MACD acima do sinal, momentum positivo.",
        "bollinger_position": "ENTRE_BANDAS",
        "support_level": 34.0,
        "resistance_level": 40.0,
        "summary": "Tendência de alta moderada com volume acima da média.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = TechnicalAgent(llm=mock_llm)
    result = await agent.run(market_data=_market_data())

    assert isinstance(result, AgentOutput)
    assert result.status == "ok"
    assert result.raw["signal"] == "ALTA"
    assert result.raw["support_level"] == 34.0


@pytest.mark.asyncio
async def test_technical_agent_handles_llm_failure(mock_llm):
    mock_llm.complete_with_routing = AsyncMock(side_effect=Exception("timeout"))

    agent = TechnicalAgent(llm=mock_llm)
    result = await agent.run(market_data=_market_data())

    assert result.status == "failed"
