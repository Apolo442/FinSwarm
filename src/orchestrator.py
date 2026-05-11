from __future__ import annotations
import asyncio
import time
from datetime import datetime, timezone

from src.agents.debaters import BullAgent, BearAgent
from src.agents.fundamental import FundamentalAgent
from src.agents.risk import RiskAgent
from src.agents.sentiment import SentimentAgent
from src.agents.synthesis import SynthesisAgent
from src.agents.technical import TechnicalAgent
from src.data.fundamentus import fetch_fundamentus
from src.data.market import fetch_market_data
from src.data.news import fetch_news
from src.llm.client import LLMClient
from src.models import AgentOutput, AnalysisResult


def _safe_output(result: AgentOutput | BaseException) -> AgentOutput:
    if isinstance(result, BaseException):
        return AgentOutput(status="failed", summary=str(result), raw={})
    return result


async def _failed_agent(reason: str) -> AgentOutput:
    return AgentOutput(status="failed", summary=reason, raw={})


async def run_analysis(
    ticker: str,
    llm: LLMClient,
    job_id: str,
    progress_callback=None,
) -> AnalysisResult:
    start = time.monotonic()

    async def notify(agent: str, status: str):
        if progress_callback:
            await progress_callback(agent, status, time.monotonic() - start)

    loop = asyncio.get_running_loop()

    # — Coleta de dados em paralelo —
    market_data_r, fundamentals_r, news_r = await asyncio.gather(
        loop.run_in_executor(None, fetch_market_data, ticker),
        loop.run_in_executor(None, fetch_fundamentus, ticker),
        fetch_news(ticker, ticker.replace(".SA", "")),
        return_exceptions=True,
    )
    market_data = None if isinstance(market_data_r, BaseException) else market_data_r
    fundamentals = None if isinstance(fundamentals_r, BaseException) else fundamentals_r
    news = news_r if not isinstance(news_r, BaseException) else None

    # — Fase 1: 3 agentes em paralelo —
    await notify("technical", "running")
    await notify("fundamental", "running")
    await notify("sentiment", "running")

    tech_r, fund_r, sent_r = await asyncio.gather(
        TechnicalAgent(llm).run(market_data=market_data) if market_data else _failed_agent("no market data"),
        FundamentalAgent(llm).run(fundamentals=fundamentals) if fundamentals else _failed_agent("no fundamentals"),
        SentimentAgent(llm).run(news=news) if news else _failed_agent("no news"),
        return_exceptions=True,
    )
    tech_out = _safe_output(tech_r)
    fund_out = _safe_output(fund_r)
    sent_out = _safe_output(sent_r)

    await notify("technical", "done")
    await notify("fundamental", "done")
    await notify("sentiment", "done")

    phase1 = {
        "technical": tech_out.raw,
        "fundamental": fund_out.raw,
        "sentiment": sent_out.raw,
    }

    # — Fase 2: sequencial —
    await notify("bull", "running")
    bull_out = _safe_output(await BullAgent(llm).run(phase1_outputs=phase1, ticker=ticker))
    await notify("bull", "done")

    await notify("bear", "running")
    bear_out = _safe_output(await BearAgent(llm).run(phase1_outputs=phase1, ticker=ticker))
    await notify("bear", "done")

    all_outputs = {**phase1, "bull": bull_out.raw, "bear": bear_out.raw}

    volatility_pct = abs(market_data.pct_20d) / 20 if market_data else 0.0

    await notify("risk", "running")
    risk_out = _safe_output(await RiskAgent(llm).run(
        all_outputs=all_outputs, ticker=ticker, volatility_pct=volatility_pct
    ))
    await notify("risk", "done")

    all_outputs["risk"] = risk_out.raw

    await notify("synthesis", "running")
    synth_out = _safe_output(await SynthesisAgent(llm).run(all_outputs=all_outputs, ticker=ticker))
    await notify("synthesis", "done")

    recommendation = synth_out.raw.get("recommendation", "MANTER")
    if recommendation not in ("COMPRAR", "MANTER", "VENDER"):
        recommendation = "MANTER"

    return AnalysisResult(
        job_id=job_id,
        ticker=ticker,
        timestamp=datetime.now(timezone.utc),
        recommendation=recommendation,
        confidence=float(synth_out.raw.get("confidence", 0.5)),
        risk_score=int(risk_out.raw.get("risk_score", 50)),
        stop_loss_pct=float(risk_out.raw.get("stop_loss_pct", 10.0)),
        agents={
            "technical": tech_out,
            "fundamental": fund_out,
            "sentiment": sent_out,
            "bull": bull_out,
            "bear": bear_out,
            "risk": risk_out,
            "synthesis": synth_out,
        },
        elapsed_seconds=time.monotonic() - start,
        cost_usd=0.0,
    )
