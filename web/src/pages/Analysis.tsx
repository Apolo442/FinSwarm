import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAnalysis } from '../lib/useAnalysis'
import { AgentTimeline } from '../components/AgentTimeline'
import { ReportHero } from '../components/ReportHero'
import { AgentSlot } from '../components/AgentSlot'
import { ErrorBanner } from '../components/ErrorBanner'
import { Button } from '../components/ui/Button'
import { AGENT_ORDER } from '../lib/types'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function LiveHeader({ ticker, running }: { ticker: string | null; running: boolean }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    const start = Date.now()
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 1000)
    return () => clearInterval(id)
  }, [running])

  return (
    <section className="relative flex flex-col gap-4 pb-10 border-b border-silver-text/15">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full opacity-25 blur-3xl"
        style={{ background: 'var(--gradient-golden)' }}
      />
      <span className="text-xs uppercase tracking-[0.2em] text-stone-text">
        Em andamento
      </span>
      <h1
        className="font-ivy text-[88px] leading-none text-transparent bg-clip-text"
        style={{ backgroundImage: 'var(--gradient-golden)' }}
      >
        Analisando
      </h1>
      <div className="flex items-baseline gap-6 mt-2">
        {ticker && (
          <span className="text-3xl text-pure-white tracking-tight tabular-nums">
            {ticker}
          </span>
        )}
        <span className="font-ivy text-3xl tabular-nums text-silver-text">
          {formatElapsed(elapsed)}
        </span>
        <span className="text-xs text-ash-text ml-auto">
          análise completa em ~10 min
        </span>
      </div>
    </section>
  )
}

export function Analysis() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const ticker = (location.state as { ticker?: string } | null)?.ticker ?? null
  const { agents, result, error, connectionLost, reconnect } = useAnalysis(
    jobId ?? ''
  )

  if (!jobId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ErrorBanner
          message="ID da análise não encontrado."
          action={{ label: 'Nova análise', onClick: () => navigate('/') }}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-[1216px] mx-auto">
        <header className="flex items-center justify-between mb-10">
          <Button variant="sharp" onClick={() => navigate('/')}>
            ← Nova análise
          </Button>
          <span className="text-xs uppercase tracking-[0.2em] text-stone-text">
            FinSwarm · multi-agente B3
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-16">
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <span className="block text-xs uppercase tracking-[0.2em] text-stone-text mb-6">
              Pipeline
            </span>
            <AgentTimeline agents={agents} />
          </aside>

          <section className="flex flex-col gap-8 min-w-0">
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
              <ReportHero result={result} />
            ) : (
              <LiveHeader ticker={ticker} running={!error} />
            )}

            <div className="flex flex-col gap-4">
              {AGENT_ORDER.map((name) => (
                <AgentSlot
                  key={name}
                  agent={name}
                  status={agents[name].status}
                  elapsed={agents[name].elapsed}
                  output={result ? result.agents[name] : null}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
