import pytest
from unittest.mock import AsyncMock
from src.agents.synthesis import SynthesisAgent
from src.models import AgentOutput
import json


def _all_outputs():
    return {
        "technical": {"signal": "ALTA", "summary": "Tendência de alta."},
        "fundamental": {"health": "BOA", "summary": "Fundamentos sólidos."},
        "sentiment": {"score": 0.72, "label": "POSITIVO", "summary": "Sentimento positivo."},
        "bull": {"conviction": "ALTA", "arguments": ["arg1", "arg2", "arg3"], "summary": "Tese bullish forte."},
        "bear": {"conviction": "MODERADA", "arguments": ["r1", "r2", "r3"], "summary": "Riscos moderados."},
        "risk": {"risk_score": 38, "stop_loss_pct": 8.5, "risk_label": "MODERADO", "summary": "Risco controlado."},
    }


@pytest.mark.asyncio
async def test_synthesis_agent_returns_valid_recommendation(mock_llm):
    response = json.dumps({
        "recommendation": "COMPRAR",
        "confidence": 0.72,
        "reasoning": "Fundamentos sólidos e sentimento positivo superam os riscos moderados.",
        "markdown": "# Análise PETR4.SA\n\n**Recomendação: COMPRAR**\n\nFundamentos sólidos...",
        "summary": "COMPRAR com 72% de confiança. Risco moderado. Stop-loss em 8.5%.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = SynthesisAgent(llm=mock_llm)
    result = await agent.run(all_outputs=_all_outputs(), ticker="PETR4.SA")

    assert result.status == "ok"
    assert result.raw["recommendation"] in ("COMPRAR", "MANTER", "VENDER")
    assert 0 <= result.raw["confidence"] <= 1
    assert "# Análise" in result.raw["markdown"]


@pytest.mark.asyncio
async def test_synthesis_agent_handles_failure(mock_llm):
    mock_llm.complete_with_routing = AsyncMock(side_effect=Exception("error"))
    agent = SynthesisAgent(llm=mock_llm)
    result = await agent.run(all_outputs=_all_outputs(), ticker="PETR4.SA")
    assert result.status == "failed"
