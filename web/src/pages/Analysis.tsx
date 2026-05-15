import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAnalysis } from '../lib/useAnalysis'
import { AgentTimeline } from '../components/AgentTimeline'
import { ReportHero } from '../components/ReportHero'
import { AgentSlot } from '../components/AgentSlot'
import { AgentBento } from '../components/AgentBento'
import { ErrorBanner } from '../components/ErrorBanner'
import { Button } from '../components/ui/Button'
import { AGENT_ORDER, type AgentName, type AnalysisRow } from '../lib/types'
import { fetchAnalyses } from '../lib/api'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface LiveHeaderProps {
  ticker: string | null
  running: boolean
  completedCount: number
  currentAgent: AgentName | null
}

function LiveHeader({ ticker, running, completedCount, currentAgent }: LiveHeaderProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    const start = Date.now()
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 1000)
    return () => clearInterval(id)
  }, [running])

  const pct = Math.round((completedCount / 7) * 100)

  return (
    <section className="glass rounded-lg p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-data-blue">Em andamento</span>
          <h1 className="text-[40px] font-semibold leading-none tracking-[-0.031px] text-polar-white">
            {ticker ?? 'Analisando'}
          </h1>
        </div>
        <span className="font-mono text-2xl tabular-nums text-polar-white">{formatElapsed(elapsed)}</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          {AGENT_ORDER.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-500 ${
              i < completedCount ? 'bg-data-blue' : 'bg-dark-frost'
            }`} />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-dim-gray">{completedCount}/7 agentes concluídos</span>
          <span className="font-mono text-[11px] text-data-blue tabular-nums">{pct}%</span>
        </div>
      </div>
      {currentAgent && (
        <div className="flex items-center gap-2 pt-1 border-t border-light-gray/15">
          <span className="h-1.5 w-1.5 rounded-full bg-data-blue animate-pulse-blue shrink-0" />
          <span className="text-sm text-silver-dust">Processando agora</span>
          <span className="font-mono text-xs text-data-blue ml-auto">{currentAgent}</span>
        </div>
      )}
    </section>
  )
}

const REC_COLOR: Record<string, string> = {
  COMPRAR: '#4ebe96', MANTER: '#e9a84a', VENDER: '#e05454',
}

function HistorySidebar({ currentJobId, ticker }: { currentJobId: string; ticker: string }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AnalysisRow[]>([])

  useEffect(() => {
    fetchAnalyses()
      .then(all => {
        const tickerBase = ticker.replace(/\.SA$/i, '').toUpperCase()
        setRows(
          all
            .filter(r => r.ticker.replace(/\.SA$/i, '').toUpperCase() === tickerBase)
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
        {rows.map(row => {
          const isCurrent = row.job_id === currentJobId
          const color = REC_COLOR[row.recommendation] ?? '#868f97'
          const date = new Date(row.timestamp).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
          return (
            <button
              key={row.job_id}
              onClick={() => navigate(`/analysis/${row.job_id}`)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px',
                borderRadius: 8, border: `1px solid ${isCurrent ? 'rgba(71,159,250,0.35)' : 'rgba(255,255,255,0.07)'}`,
                background: isCurrent ? 'rgba(71,159,250,0.08)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
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
    (n) => agents[n].status === 'ok' || agents[n].status === 'failed'
  ).length

  const effectiveTicker = result?.ticker ?? ticker ?? ''

  return (
    <main style={{ minHeight: '100vh', padding: '24px 0', width: '90%', margin: '0 auto' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 16,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Button variant="sharp" onClick={() => navigate('/')}>← Nova análise</Button>
        <span style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#868f97' }}>
          FinSwarm · multi-agente B3
        </span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Sidebar */}
        <aside style={{ position: 'sticky', top: 24 }}>
          {result ? (
            <HistorySidebar currentJobId={jobId} ticker={effectiveTicker} />
          ) : (
            <div className="glass rounded-lg p-4 flex flex-col gap-4">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#868f97' }}>Pipeline</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#479ffa' }}>
                  {completedCount}/7
                </span>
              </div>
              <AgentTimeline agents={agents} />
              <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#479ffa', borderRadius: 2,
                    width: `${(completedCount / 7) * 100}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>
                  <span>progresso</span>
                  <span>{Math.round((completedCount / 7) * 100)}%</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
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
            </>
          ) : (
            <>
              <LiveHeader
                ticker={ticker}
                running={!error}
                completedCount={completedCount}
                currentAgent={currentAgent}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {AGENT_ORDER.map((name) => (
                  <AgentSlot
                    key={name}
                    agent={name}
                    status={agents[name].status}
                    elapsed={agents[name].elapsed}
                    output={null}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
