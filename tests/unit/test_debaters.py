import pytest
from unittest.mock import AsyncMock
from src.agents.debaters import BullAgent, BearAgent
from src.models import AgentOutput
import json


def _phase1_outputs():
    return {
        "technical": {"signal": "ALTA", "summary": "Tendência de alta moderada."},
        "fundamental": {"health": "BOA", "summary": "Fundamentos sólidos."},
        "sentiment": {"score": 0.72, "summary": "Sentimento positivo."},
    }


@pytest.mark.asyncio
async def test_bull_agent_returns_three_arguments(mock_llm):
    response = json.dumps({
        "arguments": [
            "RSI abaixo de 70 com MACD cruzando para cima indica momentum de alta.",
            "ROE de 18.3% supera a média do setor em 6 pontos percentuais.",
            "Dividendos recordes atraem fluxo de capital estrangeiro.",
        ],
        "conviction": "ALTA",
        "summary": "Tese de alta com 3 fundamentos técnicos e fundamentais sólidos.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = BullAgent(llm=mock_llm)
    result = await agent.run(phase1_outputs=_phase1_outputs(), ticker="PETR4.SA")

    assert result.status == "ok"
    assert len(result.raw["arguments"]) == 3
    assert result.raw["conviction"] == "ALTA"


@pytest.mark.asyncio
async def test_bear_agent_returns_three_arguments(mock_llm):
    response = json.dumps({
        "arguments": [
            "Dependência de commodities expõe o papel a choques externos de preço.",
            "Dívida bruta/PL de 0.8 limita capacidade de reinvestimento.",
            "Setor de petróleo enfrenta pressão regulatória crescente no Brasil.",
        ],
        "conviction": "MODERADA",
        "summary": "Riscos estruturais mitigam o potencial de alta no curto prazo.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = BearAgent(llm=mock_llm)
    result = await agent.run(phase1_outputs=_phase1_outputs(), ticker="PETR4.SA")

    assert result.status == "ok"
    assert len(result.raw["arguments"]) == 3
