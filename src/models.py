from __future__ import annotations
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


class AgentOutput(BaseModel):
    status: Literal["ok", "failed"]
    summary: str
    raw: dict[str, Any] = Field(default_factory=dict)


class AnalysisRequest(BaseModel):
    ticker: str


class AnalysisResult(BaseModel):
    job_id: str
    ticker: str
    timestamp: datetime
    recommendation: Literal["COMPRAR", "MANTER", "VENDER"]
    confidence: float = Field(ge=0.0, le=1.0)
    risk_score: int = Field(ge=0, le=100)
    stop_loss_pct: float
    agents: dict[str, AgentOutput]
    elapsed_seconds: float
    cost_usd: float = 0.0


class JobStatus(BaseModel):
    job_id: str
    ticker: str
    status: Literal["running", "done", "failed"]


class WsEvent(BaseModel):
    event: Literal["agent_start", "agent_done", "done", "error"]
    agent: str | None = None
    elapsed: float | None = None
    result: AnalysisResult | None = None
    message: str | None = None
