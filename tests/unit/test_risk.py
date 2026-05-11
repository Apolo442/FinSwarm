import pytest
from unittest.mock import AsyncMock
from src.agents.risk import RiskAgent
from src.models import AgentOutput
import json


def _all_outputs():
    return {
        "technical": {"signal": "ALTA", "summary": "Tendência de alta."},
        "fundamental": {"health": "BOA", "debt_risk": "MODERADO", "summary": "Fundamentos ok."},
        "sentiment": {"score": 0.72, "label": "POSITIVO", "summary": "Sentimento positivo."},
        "bull": {"conviction": "ALTA", "summary": "Tese de alta sólida."},
        "bear": {"conviction": "MODERADA", "summary": "Riscos controlados."},
    }


@pytest.mark.asyncio
async def test_risk_agent_returns_valid_score(mock_llm):
    response = json.dumps({
        "risk_score": 38,
        "stop_loss_pct": 8.5,
        "max_exposure_pct": 5.0,
        "risk_label": "MODERADO",
        "main_risks": ["Volatilidade do petróleo", "Câmbio"],
        "summary": "Risco moderado com stop-loss recomendado em 8.5% abaixo do preço atual.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = RiskAgent(llm=mock_llm)
    result = await agent.run(all_outputs=_all_outputs(), ticker="PETR4.SA", volatility_pct=2.1)

    assert result.status == "ok"
    assert 0 <= result.raw["risk_score"] <= 100
    assert result.raw["stop_loss_pct"] > 0


@pytest.mark.asyncio
async def test_risk_agent_handles_failure(mock_llm):
    mock_llm.complete_with_routing = AsyncMock(side_effect=Exception("error"))
    agent = RiskAgent(llm=mock_llm)
    result = await agent.run(all_outputs=_all_outputs(), ticker="PETR4.SA", volatility_pct=2.1)
    assert result.status == "failed"
