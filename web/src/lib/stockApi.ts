export interface QuoteData {
  price: number; prev_close: number; change: number; change_pct: number
  volume: number | null; mkt_cap: number | null; currency: string
}
export interface ProfileData {
  long_name: string | null; summary: string | null
  ceo: string | null; founded: number | null
  employees: number | null; website: string | null
  sector: string | null; industry: string | null
}
export interface KPIData {
  mkt_cap: number | null; div_yield: number | null
  pl_12m: number | null; eps_12m: number | null
  beta: number | null; volatility: number | null
  last_quarter_profit: number | null
}
export interface ShareholdersData {
  closely_held_pct: number | null
  free_float_pct: number | null
  total_shares: number | null
}
export interface SeasonalMonth { month: number; avg_return_pct: number }
export interface TechnicalsSummary {
  signal: string; today: string; week: string; month: string
  counts: Record<string, number>
}
export interface ForecastSummary {
  target_mean: number | null; target_high: number | null
  target_low: number | null; target_median: number | null
  current: number | null; recommendations: Record<string, number>
}
export interface NewsItem {
  title: string; source: string; url: string | null
  published_at: string | null; summary: string | null
  sentiment: 'POS' | 'NEG' | 'NEU' | null
  sentiment_score: number | null
}
export interface OverviewResponse {
  ticker: string; quote: QuoteData; profile: ProfileData; kpis: KPIData
  shareholders: ShareholdersData; seasonals_mini: SeasonalMonth[]
  news_preview: NewsItem[]; technicals_summary: TechnicalsSummary
  forecast_summary: ForecastSummary
}
export interface CapitalStructure {
  mkt_cap: number | null; debt: number | null
  cash: number | null; minority_interest: number | null
  enterprise_value: number | null
}
export interface ValuationData {
  pl: number | null; ps: number | null; pb: number | null
  ev_ebitda: number | null; revenue: number | null; net_income: number | null
}
export interface GrowthYear { year: number; revenue: number | null }
export interface ProfitabilityData {
  roe: number | null; roa: number | null
  net_margin: number | null; ebit_margin: number | null
}
export interface DividendYear { year: number; dps: number | null; dy_pct: number | null }
export interface HealthYear {
  year: number; loans: number | null; deposits: number | null; provisions: number | null
}
export interface EarningsRow {
  date: string | null; period: string | null
  eps_reported: number | null; eps_estimate: number | null; eps_surprise_pct: number | null
  revenue_reported: number | null; revenue_estimate: number | null; revenue_surprise_pct: number | null
}
export interface FinancialsResponse {
  facts: KPIData; capital_structure: CapitalStructure; valuation: ValuationData
  growth: GrowthYear[]; profitability: ProfitabilityData; dividends_history: DividendYear[]
  next_dividend: { amount: number | null; ex_date: string | null } | null
  financial_health: HealthYear[]; estimates: EarningsRow[]
}
export interface IndicatorRow { name: string; value: number | null; signal: string }
export interface PivotRow {
  method: string; p: number | null
  r1: number | null; r2: number | null; r3: number | null
  s1: number | null; s2: number | null; s3: number | null
}
export interface TechnicalsResponse {
  summary: TechnicalsSummary; oscillators: IndicatorRow[]
  moving_averages: IndicatorRow[]; pivots: PivotRow[]
}
export interface ForecastResponse {
  price_target: ForecastSummary; recommendations: Record<string, number>
  eps_history: EarningsRow[]; revenue_history: EarningsRow[]
  next_eps_estimate: number | null; next_revenue_estimate: number | null
}
export interface SeasonalYear {
  year: number; data: { month: number; return_pct: number }[]
}
export interface SeasonalsResponse {
  monthly_avg_5y: SeasonalMonth[]; years: SeasonalYear[]
}
export interface NewsResponse { items: NewsItem[]; next_cursor: string | null }

function tickerBase(t: string): string {
  return t.toUpperCase().replace(/\.SA$/i, '')
}
async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  return r.json() as Promise<T>
}
export const fetchOverview     = (t: string) => getJson<OverviewResponse>    (`/stock/${tickerBase(t)}/overview`)
export const fetchFinancials   = (t: string) => getJson<FinancialsResponse>  (`/stock/${tickerBase(t)}/financials`)
export const fetchStockNews    = (t: string, limit = 20) => getJson<NewsResponse>(`/stock/${tickerBase(t)}/news?limit=${limit}`)
export const fetchTechnicals   = (t: string) => getJson<TechnicalsResponse>  (`/stock/${tickerBase(t)}/technicals`)
export const fetchForecastData = (t: string) => getJson<ForecastResponse>    (`/stock/${tickerBase(t)}/forecast`)
export const fetchSeasonals    = (t: string) => getJson<SeasonalsResponse>   (`/stock/${tickerBase(t)}/seasonals`)
