import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ReportHero } from '../components/ReportHero'
import { AgentBento } from '../components/AgentBento'
import { ErrorBanner } from '../components/ErrorBanner'
import { Button } from '../components/ui/Button'
import { useAnalysis } from '../lib/useAnalysis'
import { AGENT_ORDER, type AgentName, type AgentState, type AnalysisRow } from '../lib/types'
import { AGENT_LABELS, AGENT_RUNNING_PHRASES } from '../lib/agentLabels'
import { fetchAnalyses } from '../lib/api'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const REC_COLOR: Record<string, string> = {
  COMPRAR: '#4ebe96',
  MANTER: '#e9a84a',
  VENDER: '#e05454',
}

const LIVE_STATUS_LABEL: Record<AgentName, string> = {
  technical: 'mercado em leitura',
  fundamental: 'valuation em curso',
  sentiment: 'fluxo de notícias',
  bull: 'tese de alta',
  bear: 'tese de baixa',
  risk: 'matriz de risco',
  synthesis: 'comitê final',
}

const LIVE_STATUS_SHORT: Record<AgentState['status'], string> = {
  pending: 'standby',
  running: 'live',
  ok: 'done',
  failed: 'erro',
}

const LIVE_STATUS_ACCENT: Record<AgentName, string> = {
  technical: '#479ffa',
  fundamental: '#ffa16c',
  sentiment: '#4ebe96',
  bull: '#4ebe96',
  bear: '#e05454',
  risk: '#e9a84a',
  synthesis: '#ffa16c',
}

interface LiveHeroProps {
  ticker: string | null
  running: boolean
  completedCount: number
  currentAgent: AgentName | null
}

function LiveMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-white/7 bg-white/[0.03] px-4 py-3">
      <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[#868f97]">{label}</div>
      <div className="mt-1 truncate text-base font-semibold tracking-[-0.03em] text-white md:text-lg">{value}</div>
    </div>
  )
}

function LiveHero({ ticker, running, completedCount, currentAgent }: LiveHeroProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    const start = Date.now()
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 1000)
    return () => clearInterval(id)
  }, [running])

  const pct = Math.round((completedCount / AGENT_ORDER.length) * 100)
  const currentLabel = currentAgent ? AGENT_LABELS[currentAgent] : 'Preparando análise'
  const currentLine = currentAgent ? AGENT_RUNNING_PHRASES[currentAgent] : 'Carregando contexto inicial'
  const currentAccent = currentAgent ? LIVE_STATUS_ACCENT[currentAgent] : '#479ffa'
  const ringStyle = {
    background: `conic-gradient(${currentAccent} 0 ${pct}%, rgba(255,255,255,0.08) ${pct}% 100%)`,
  }

  return (
    <section
      className="glass-strong relative overflow-hidden rounded-[28px] border border-white/10 px-5 py-5 md:px-7 md:py-6"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02) 48%, rgba(255,161,108,0.04))',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
        style={{ background: 'rgba(255,161,108,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 bottom-0 h-40 w-40 rounded-full blur-3xl"
        style={{ background: 'rgba(71,159,250,0.10)' }}
      />

      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_300px] xl:items-stretch">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#868f97]">
                análise em andamento
              </span>
              <h1 className="mt-3 break-words text-[36px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[48px] md:text-[56px]">
                {ticker ?? 'Analisando'}
              </h1>
            </div>
            <span className="shrink-0 font-mono text-base tabular-nums text-white/92 sm:text-lg md:text-xl">
              {formatElapsed(elapsed)}
            </span>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
            <div
              className="min-w-0 rounded-[24px] border border-white/8 p-5"
              style={{ background: 'rgba(255,255,255,0.025)' }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span
                  className="truncate font-mono text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: currentAccent }}
                >
                  {currentAgent ? LIVE_STATUS_LABEL[currentAgent] : 'pipeline'}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-[#868f97]">{pct}%</span>
              </div>

              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${currentAccent}, rgba(255,255,255,0.85))`,
                  }}
                />
              </div>

              <div className="space-y-2">
                <h2 className="break-words text-[24px] font-semibold leading-none tracking-[-0.03em] text-white sm:text-[28px]">
                  {currentLabel}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-[#cccccc]">
                  {currentLine}
                </p>
              </div>
            </div>

            <div
              className="min-w-0 rounded-[24px] border border-white/8 p-5"
              style={{ background: 'rgba(255,255,255,0.025)' }}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-2">
                <LiveMetric label="concluídos" value={`${completedCount}/7`} />
                <LiveMetric
                  label="em foco"
                  value={currentAgent ? String(AGENT_ORDER.indexOf(currentAgent) + 1).padStart(2, '0') : '00'}
                />
                <LiveMetric label="latência" value={running ? 'ao vivo' : 'offline'} />
                <LiveMetric label="modo" value="multi" />
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex min-w-0 items-center justify-center rounded-[24px] border border-white/8 p-5"
          style={{ background: 'rgba(255,255,255,0.025)' }}
        >
          <div className="relative flex h-[190px] w-[190px] items-center justify-center rounded-full sm:h-[210px] sm:w-[210px]">
            <div
              className="absolute inset-0 rounded-full p-[12px] shadow-[0_0_60px_rgba(255,161,108,0.08)]"
              style={ringStyle}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full border border-white/8 bg-[#171717]/92">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#868f97]">
                    swarm sync
                  </span>
                  <span className="text-[44px] font-semibold leading-none tracking-[-0.05em] text-white sm:text-[52px]">
                    {pct}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#868f97]">
                    percent
                  </span>
                </div>
              </div>
            </div>
            <div
              aria-hidden
              className="absolute inset-[28px] rounded-full border border-white/6 sm:inset-[32px]"
              style={{ boxShadow: `0 0 40px ${currentAccent}22 inset` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function LivePipeline({
  agents,
  currentAgent,
}: {
  agents: Record<AgentName, AgentState>
  currentAgent: AgentName | null
}) {
  return (
    <section className="glass min-w-0 rounded-[24px] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#868f97]">pipeline</span>
        <span className="font-mono text-[11px] text-[#479ffa]">{AGENT_ORDER.length} agentes</span>
      </div>

      <div className="grid gap-2">
        {AGENT_ORDER.map((agent, index) => {
          const item = agents[agent]
          const isCurrent = currentAgent === agent
          const isDone = item.status === 'ok'
          const isFailed = item.status === 'failed'
          const accent = isFailed ? '#e05454' : isCurrent ? LIVE_STATUS_ACCENT[agent] : isDone ? '#479ffa' : '#868f97'

          return (
            <div
              key={agent}
              className="min-w-0 rounded-[18px] border px-3 py-3 transition-all duration-300 md:px-4"
              style={{
                background: isCurrent ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
                borderColor: isCurrent ? `${accent}55` : 'rgba(255,255,255,0.07)',
                boxShadow: isCurrent ? `0 0 24px ${accent}18` : 'none',
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]"
                  style={{
                    borderColor: `${accent}55`,
                    color: accent,
                    background: `${accent}12`,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-white">{AGENT_LABELS[agent]}</span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: accent }}>
                      {LIVE_STATUS_SHORT[item.status]}
                    </span>
                  </div>

                  <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#868f97]">
                      {LIVE_STATUS_LABEL[agent]}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-[#868f97]">
                      {item.elapsed !== null ? `${item.elapsed.toFixed(1)}s` : '...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function LiveStageCard({ currentAgent }: { currentAgent: AgentName | null }) {
  if (!currentAgent) {
    return (
      <section className="glass min-w-0 rounded-[24px] p-5 md:p-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#868f97]">estado</span>
        <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.03em] text-white sm:text-[28px]">Preparando o swarm</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#cccccc]">
          O backend está reunindo contexto antes de abrir a sequência principal de análise.
        </p>
      </section>
    )
  }

  const accent = LIVE_STATUS_ACCENT[currentAgent]

  return (
    <section
      className="relative min-w-0 overflow-hidden rounded-[24px] border p-5 md:p-6"
      style={{
        background: `linear-gradient(140deg, ${accent}12, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.02))`,
        borderColor: `${accent}33`,
      }}
    >
      <div
        aria-hidden
        className="absolute -right-12 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: `${accent}22` }}
      />
      <div className="relative min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>
          agora
        </div>
        <h2 className="mt-3 break-words text-[26px] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[30px] md:text-[34px]">
          {AGENT_LABELS[currentAgent]}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#cccccc]">
          {AGENT_RUNNING_PHRASES[currentAgent]}
        </p>
      </div>
    </section>
  )
}

function LiveAgentGrid({
  agents,
  currentAgent,
}: {
  agents: Record<AgentName, AgentState>
  currentAgent: AgentName | null
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {AGENT_ORDER.map((agent) => {
        const item = agents[agent]
        const isCurrent = currentAgent === agent
        const accent =
          item.status === 'failed'
            ? '#e05454'
            : item.status === 'ok'
              ? '#4ebe96'
              : isCurrent
                ? LIVE_STATUS_ACCENT[agent]
                : '#868f97'

        return (
          <article
            key={agent}
            className="relative min-w-0 overflow-hidden rounded-[22px] border p-4 transition-all duration-300"
            style={{
              background: isCurrent
                ? `linear-gradient(135deg, ${accent}18, rgba(255,255,255,0.03))`
                : 'rgba(255,255,255,0.025)',
              borderColor: isCurrent ? `${accent}55` : 'rgba(255,255,255,0.07)',
            }}
          >
            {isCurrent && (
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />
            )}

            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[#868f97]">
                  {LIVE_STATUS_LABEL[agent]}
                </div>
                <h3 className="mt-2 break-words text-sm font-medium leading-tight text-white sm:text-base">
                  {AGENT_LABELS[agent]}
                </h3>
              </div>
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: accent,
                  boxShadow: item.status === 'running' ? `0 0 14px ${accent}` : 'none',
                  opacity: item.status === 'pending' ? 0.45 : 1,
                }}
              />
            </div>

            <div className="mt-6 flex min-w-0 items-end justify-between gap-3">
              <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: accent }}>
                {LIVE_STATUS_SHORT[item.status]}
              </span>
              <span className="shrink-0 font-mono text-xs text-[#868f97]">
                {item.elapsed !== null ? `${item.elapsed.toFixed(1)}s` : 'aguardando'}
              </span>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function HistorySidebar({ currentJobId, ticker }: { currentJobId: string; ticker: string }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AnalysisRow[]>([])

  useEffect(() => {
    fetchAnalyses()
      .then((all) => {
        const tickerBase = ticker.replace(/\.SA$/i, '').toUpperCase()
        setRows(
          all
            .filter((r) => r.ticker.replace(/\.SA$/i, '').toUpperCase() === tickerBase)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        )
      })
      .catch(() => {})
  }, [ticker])

  return (
    <div className="glass rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest text-dim-gray">Histórico</span>
        <span className="font-mono text-[11px] text-data-blue tabular-nums">{rows.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const isCurrent = row.job_id === currentJobId
          const color = REC_COLOR[row.recommendation] ?? '#868f97'
          const date = new Date(row.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
          return (
            <button
              key={row.job_id}
              onClick={() => navigate(`/analysis/${row.job_id}`)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${isCurrent ? 'rgba(71,159,250,0.35)' : 'rgba(255,255,255,0.07)'}`,
                background: isCurrent ? 'rgba(71,159,250,0.08)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>{date}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color }}>
                  {row.recommendation}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97' }}>
                  confiança {Math.round(row.confidence * 100)}%
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97' }}>
                  risco {row.risk_score}
                </span>
              </div>
            </button>
          )
        })}
        {rows.length === 0 && (
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}>
            Sem análises anteriores
          </span>
        )}
      </div>
    </div>
  )
}

export function Analysis() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const ticker = (location.state as { ticker?: string } | null)?.ticker ?? null
  const { agents, currentAgent, result, error, connectionLost, reconnect } = useAnalysis(jobId ?? '')

  if (!jobId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <ErrorBanner
          message="ID da análise não encontrado."
          action={{ label: 'Nova análise', onClick: () => navigate('/') }}
        />
      </main>
    )
  }

  const completedCount = AGENT_ORDER.filter(
    (name) => agents[name].status === 'ok' || agents[name].status === 'failed'
  ).length
  const effectiveTicker = result?.ticker ?? ticker ?? ''

  return (
    <main style={{ minHeight: '100vh', padding: '20px 0 28px', width: '96%', margin: '0 auto', maxWidth: 1560 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Button variant="sharp" onClick={() => navigate('/')}>
          ← Nova análise
        </Button>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#868f97',
          }}
        >
          FinSwarm · multi-agente B3
        </span>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        {error && !result && (
          <ErrorBanner message={error} action={{ label: 'Nova análise', onClick: () => navigate('/') }} />
        )}
        {connectionLost && !error && (
          <ErrorBanner message="Conexão interrompida." action={{ label: 'Tentar novamente', onClick: reconnect }} />
        )}

        {result ? (
          <>
            <ReportHero result={result} />
            <AgentBento result={result} />
            <HistorySidebar currentJobId={jobId} ticker={effectiveTicker} />
          </>
        ) : (
          <>
            <LiveHero
              ticker={ticker}
              running={!error}
              completedCount={completedCount}
              currentAgent={currentAgent}
            />

            <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="min-w-0">
                <LivePipeline agents={agents} currentAgent={currentAgent} />
              </aside>

              <div className="flex min-w-0 flex-col gap-4">
                <LiveStageCard currentAgent={currentAgent} />
                <LiveAgentGrid agents={agents} currentAgent={currentAgent} />
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
