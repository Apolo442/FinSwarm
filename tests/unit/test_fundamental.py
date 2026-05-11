import pytest
from unittest.mock import AsyncMock
from src.agents.fundamental import FundamentalAgent
from src.data.fundamentus import FundamentusData
from src.models import AgentOutput
import json


def _fund_data():
    return FundamentusData(
        ticker="PETR4", pl=8.5, pvp=1.2, roe=0.183,
        divida_bruta_pl=0.8, margem_ebit=0.221,
    )


@pytest.mark.asyncio
async def test_fundamental_agent_returns_ok_output(mock_llm):
    response = json.dumps({
        "health": "BOA",
        "valuation": "BARATO",
        "roe_interpretation": "ROE de 18.3% é excelente para o setor.",
        "debt_risk": "MODERADO",
        "summary": "Empresa com fundamentos sólidos e valuation atrativo.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = FundamentalAgent(llm=mock_llm)
    result = await agent.run(fundamentals=_fund_data())

    assert result.status == "ok"
    assert result.raw["health"] == "BOA"
    assert result.raw["valuation"] == "BARATO"


@pytest.mark.asyncio
async def test_fundamental_agent_handles_llm_failure(mock_llm):
    mock_llm.complete_with_routing = AsyncMock(side_effect=Exception("error"))
    agent = FundamentalAgent(llm=mock_llm)
    result = await agent.run(fundamentals=_fund_data())
    assert result.status == "failed"
