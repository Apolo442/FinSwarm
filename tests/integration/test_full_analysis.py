# tests/integration/test_full_analysis.py
import os
import pytest
from src.llm.client import LLMClient
from src.orchestrator import run_analysis
from src.models import AnalysisResult


pytestmark = pytest.mark.integration


@pytest.fixture
def llm():
    if not os.environ.get("OPENROUTER_API_KEY"):
        pytest.skip("OPENROUTER_API_KEY não configurada")
    return LLMClient()


@pytest.mark.asyncio
async def test_full_analysis_petr4(llm):
    result = await run_analysis("PETR4.SA", llm, job_id="integration-test")

    assert isinstance(result, AnalysisResult)
    assert result.ticker == "PETR4.SA"
    assert result.recommendation in ("COMPRAR", "MANTER", "VENDER")
    assert 0.0 <= result.confidence <= 1.0
    assert 0 <= result.risk_score <= 100
    assert result.elapsed_seconds < 600
    assert len(result.agents) == 7

    failed = [k for k, v in result.agents.items() if v.status == "failed"]
    assert len(failed) <= 2, f"Muitos agentes falharam: {failed}"
