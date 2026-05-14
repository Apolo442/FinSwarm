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


class AnalysisRow(BaseModel):
    job_id: str
    ticker: str
    timestamp: datetime
    recommendation: Literal["COMPRAR", "MANTER", "VENDER"]
    confidence: float
    risk_score: int


class QuoteData(BaseModel):
    price: float
    prev_close: float
    change: float
    change_pct: float
    volume: int | None = None
    mkt_cap: float | None = None
    currency: str = "BRL"


class ProfileData(BaseModel):
    long_name: str | None = None
    summary: str | None = None
    ceo: str | None = None
    founded: int | None = None
    employees: int | None = None
    website: str | None = None
    sector: str | None = None
    industry: str | None = None


class KPIData(BaseModel):
    mkt_cap: float | None = None
    div_yield: float | None = None
    pl_12m: float | None = None
    eps_12m: float | None = None
    beta: float | None = None
    volatility: float | None = None
    last_quarter_profit: float | None = None


class EarningsRow(BaseModel):
    date: str | None = None
    period: str | None = None
    eps_reported: float | None = None
    eps_estimate: float | None = None
    eps_surprise_pct: float | None = None
    revenue_reported: float | None = None
    revenue_estimate: float | None = None
    revenue_surprise_pct: float | None = None


class ShareholdersData(BaseModel):
    closely_held_pct: float | None = None
    free_float_pct: float | None = None
    total_shares: float | None = None


class SeasonalMonth(BaseModel):
    month: int
    avg_return_pct: float


class TechnicalsSummary(BaseModel):
    signal: str
    today: str
    week: str
    month: str
    counts: dict[str, int] = {}


class ForecastSummary(BaseModel):
    target_mean: float | None = None
    target_high: float | None = None
    target_low: float | None = None
    target_median: float | None = None
    current: float | None = None
    recommendations: dict[str, int] = {}


class NewsItem(BaseModel):
    title: str
    source: str = ""
    url: str | None = None
    published_at: str | None = None
    summary: str | None = None
    sentiment: Literal["POS", "NEG", "NEU"] | None = None
    sentiment_score: int | None = None


class OverviewResponse(BaseModel):
    ticker: str
    quote: QuoteData
    profile: ProfileData
    kpis: KPIData
    last_earnings: EarningsRow | None = None
    next_earnings: dict | None = None
    shareholders: ShareholdersData
    seasonals_mini: list[SeasonalMonth]
    news_preview: list[NewsItem]
    technicals_summary: TechnicalsSummary
    forecast_summary: ForecastSummary


class CapitalStructure(BaseModel):
    mkt_cap: float | None = None
    debt: float | None = None
    cash: float | None = None
    minority_interest: float | None = None
    enterprise_value: float | None = None


class ValuationData(BaseModel):
    pl: float | None = None
    ps: float | None = None
    pb: float | None = None
    ev_ebitda: float | None = None
    revenue: float | None = None
    net_income: float | None = None


class GrowthYear(BaseModel):
    year: int
    revenue: float | None = None


class ProfitabilityData(BaseModel):
    roe: float | None = None
    roa: float | None = None
    net_margin: float | None = None
    ebit_margin: float | None = None


class DividendYear(BaseModel):
    year: int
    dps: float | None = None
    dy_pct: float | None = None


class HealthYear(BaseModel):
    year: int
    loans: float | None = None
    deposits: float | None = None
    provisions: float | None = None


class FinancialsResponse(BaseModel):
    facts: KPIData
    capital_structure: CapitalStructure
    valuation: ValuationData
    growth: list[GrowthYear]
    profitability: ProfitabilityData
    dividends_history: list[DividendYear]
    next_dividend: dict | None = None
    financial_health: list[HealthYear]
    estimates: list[EarningsRow]


class NewsResponse(BaseModel):
    items: list[NewsItem]
    next_cursor: str | None = None


class PivotRow(BaseModel):
    method: str
    p: float | None = None
    r1: float | None = None
    r2: float | None = None
    r3: float | None = None
    s1: float | None = None
    s2: float | None = None
    s3: float | None = None


class IndicatorRow(BaseModel):
    name: str
    value: float | None = None
    signal: str


class TechnicalsResponse(BaseModel):
    summary: TechnicalsSummary
    oscillators: list[IndicatorRow]
    moving_averages: list[IndicatorRow]
    pivots: list[PivotRow]


class ForecastResponse(BaseModel):
    price_target: ForecastSummary
    recommendations: dict[str, int]
    eps_history: list[EarningsRow]
    revenue_history: list[EarningsRow]
    next_eps_estimate: float | None = None
    next_revenue_estimate: float | None = None


class SeasonalYear(BaseModel):
    year: int
    data: list[dict]


class SeasonalsResponse(BaseModel):
    monthly_avg_5y: list[SeasonalMonth]
    years: list[SeasonalYear]
