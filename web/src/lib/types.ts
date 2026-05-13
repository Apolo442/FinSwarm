export const AGENT_ORDER = [
  'technical',
  'fundamental',
  'sentiment',
  'bull',
  'bear',
  'risk',
  'synthesis',
] as const

export type AgentName = (typeof AGENT_ORDER)[number]

export type Recommendation = 'COMPRAR' | 'MANTER' | 'VENDER'

export interface AgentOutput {
  status: 'ok' | 'failed'
  summary: string
  raw: Record<string, unknown>
}

export interface AnalysisResult {
  job_id: string
  ticker: string
  timestamp: string
  recommendation: Recommendation
  confidence: number
  risk_score: number
  stop_loss_pct: number
  agents: Record<AgentName, AgentOutput>
  elapsed_seconds: number
  cost_usd: number
}

export interface JobStatus {
  job_id: string
  ticker: string
  status: 'running' | 'done' | 'failed'
}

export type WsEvent =
  | { event: 'agent_start'; agent: AgentName; elapsed: number }
  | { event: 'agent_done'; agent: AgentName; elapsed: number }
  | { event: 'done'; result: AnalysisResult; elapsed: number }
  | { event: 'error'; message: string }

export type AgentStatus = 'pending' | 'running' | 'ok' | 'failed'

export interface AgentState {
  status: AgentStatus
  elapsed: number | null
}

export interface AnalysisRow {
  job_id: string
  ticker: string
  timestamp: string
  recommendation: Recommendation
  confidence: number
  risk_score: number
}
