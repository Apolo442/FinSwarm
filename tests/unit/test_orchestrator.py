import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.orchestrator import run_analysis
from src.models import AnalysisResult, AgentOutput


def _make_agent_output(signal="ALTA", recommendation=None):
    raw = {"signal": signal, "summary": "ok", "score": 0.5, "risk_score": 38, "stop_loss_pct": 8.5}
    if recommendation:
        raw["recommendation"] = recommendation
        raw["confidence"] = 0.72
        raw["markdown"] = "# Test"
    return AgentOutput(status="ok", summary="ok", raw=raw)


@pytest.mark.asyncio
@patch("src.orchestrator.fetch_market_data")
@patch("src.orchestrator.fetch_fundamentus")
@patch("src.orchestrator.fetch_news")
async def test_run_analysis_returns_analysis_result(mock_news, mock_fund, mock_market, mock_llm):
    from src.data.market import MarketData
    from src.data.fundamentus import FundamentusData
    from src.data.news import NewsData

    mock_market.return_value = MarketData(
        ticker="PETR4.SA", price=38.50, pct_20d=2.3, volume_avg_20d=45_000_000,
        rsi=58.2, macd=0.12, macd_signal=0.08, macd_hist=0.04,
        bb_upper=40.0, bb_mid=37.0, bb_lower=34.0, name="Petrobras", sector="Energy",
    )
    mock_fund.return_value = FundamentusData(
        ticker="PETR4", pl=8.5, pvp=1.2, roe=0.183, divida_bruta_pl=0.8, margem_ebit=0.221,
    )
    mock_news.return_value = NewsData(ticker="PETR4", headlines=["Petrobras sobe 3%"])

    mock_llm.complete_with_routing = AsyncMock(return_value='{"signal":"ALTA","summary":"ok","score":0.5,"recommendation":"COMPRAR","confidence":0.72,"stop_loss_pct":8.5,"markdown":"# Test","risk_score":38}')

    result = await run_analysis("PETR4.SA", mock_llm, job_id="test123")

    assert isinstance(result, AnalysisResult)
    assert result.ticker == "PETR4.SA"
    assert result.recommendation in ("COMPRAR", "MANTER", "VENDER")
    assert result.job_id == "test123"
    assert result.elapsed_seconds >= 0
    assert len(result.agents) == 7
