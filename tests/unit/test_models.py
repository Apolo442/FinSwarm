from src.models import AgentOutput, AnalysisResult, AnalysisRequest
from datetime import datetime, timezone


def test_agent_output_ok():
    out = AgentOutput(status="ok", summary="Tendência de alta", raw={"signal": "ALTA"})
    assert out.status == "ok"
    assert out.raw["signal"] == "ALTA"


def test_agent_output_failed():
    out = AgentOutput(status="failed", summary="Timeout", raw={})
    assert out.status == "failed"


def test_analysis_result_fields():
    result = AnalysisResult(
        job_id="abc123",
        ticker="PETR4.SA",
        timestamp=datetime.now(timezone.utc),
        recommendation="COMPRAR",
        confidence=0.72,
        risk_score=38,
        stop_loss_pct=8.5,
        agents={},
        elapsed_seconds=28.4,
        cost_usd=0.0,
    )
    assert result.recommendation == "COMPRAR"
    assert 0 <= result.confidence <= 1


def test_analysis_request_defaults():
    req = AnalysisRequest(ticker="VALE3.SA")
    assert req.ticker == "VALE3.SA"
