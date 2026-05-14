import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAnalysis } from '../lib/useAnalysis'
import { AgentTimeline } from '../components/AgentTimeline'
import { ReportHero } from '../components/ReportHero'
import { AgentSlot } from '../components/AgentSlot'
import { AgentBento } from '../components/AgentBento'
import { ErrorBanner } from '../components/ErrorBanner'
import { Button } from '../components/ui/Button'
import { AGENT_ORDER, type AgentName } from '../lib/types'

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
      {/* Top row: label + timer */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-data-blue">
            Em andamento
          </span>
          <h1 className="text-[40px] font-semibold leading-none tracking-[-0.031px] text-polar-white">
            {ticker ?? 'Analisando'}
          </h1>
        </div>
        <div className="text-right flex flex-col gap-0.5">
          <span className="font-mono text-2xl tabular-nums text-polar-white">
            {formatElapsed(elapsed)}
          </span>
        </div>
      </div>

      {/* Progress bar — 7 segments */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          {AGENT_ORDER.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                i < completedCount ? 'bg-data-blue' : 'bg-dark-frost'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-dim-gray">
            {completedCount}/7 agentes concluídos
          </span>
          <span className="font-mono text-[11px] text-data-blue tabular-nums">
            {pct}%
          </span>
        </div>
      </div>

      {/* Current agent label */}
      {currentAgent && (
        <div className="flex items-center gap-2 pt-1 border-t border-light-gray/15">
          <span className="h-1.5 w-1.5 rounded-full bg-data-blue animate-pulse-blue shrink-0" />
          <span className="text-sm text-silver-dust">
            Processando agora
          </span>
          <span className="font-mono text-xs text-data-blue ml-auto">
            {currentAgent}
          </span>
        </div>
      )}
    </section>
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

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="max-w-[1216px] mx-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-light-gray/15">
          <Button variant="sharp" onClick={() => navigate('/')}>
            ← Nova análise
          </Button>
          <span className="font-mono text-[11px] uppercase tracking-widest text-dim-gray">
            FinSwarm · multi-agente B3
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar — glassmorphism panel */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="glass rounded-lg p-4 flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-dim-gray">
                  Pipeline
                </span>
                <span className="font-mono text-[11px] text-data-blue tabular-nums">
                  {completedCount}/7
                </span>
              </div>

              {/* Timeline */}
              <AgentTimeline agents={agents} />

              {/* Overall progress bar */}
              <div className="pt-3 border-t border-light-gray/15 flex flex-col gap-2">
                <div className="h-1 bg-dark-frost rounded-full overflow-hidden">
                  <div
                    className="h-full bg-data-blue rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / 7) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[10px] text-dim-gray">
                  <span>progresso</span>
                  <span>{Math.round((completedCount / 7) * 100)}%</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <section className="flex flex-col gap-4 min-w-0">
            {error && (
              <ErrorBanner
                message={error}
                action={{ label: 'Nova análise', onClick: () => navigate('/') }}
              />
            )}
            {connectionLost && !error && (
              <ErrorBanner
                message="Conexão interrompida."
                action={{ label: 'Tentar novamente', onClick: reconnect }}
              />
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
                <div className="flex flex-col gap-2.5">
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
      </div>
    </main>
  )
}
