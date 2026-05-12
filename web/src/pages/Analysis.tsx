import { useNavigate, useParams } from 'react-router-dom'
import { useAnalysis } from '../lib/useAnalysis'
import { AgentTimeline } from '../components/AgentTimeline'
import { ReportHero } from '../components/ReportHero'
import { AgentCard } from '../components/AgentCard'
import { ErrorBanner } from '../components/ErrorBanner'
import { Button } from '../components/ui/Button'
import { AGENT_ORDER } from '../lib/types'
import { AGENT_RUNNING_PHRASES } from '../lib/agentLabels'

export function Analysis() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { agents, currentAgent, result, error, connectionLost, reconnect } =
    useAnalysis(jobId ?? '')

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
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-[1216px] mx-auto grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-12">
        <aside>
          <header className="mb-8 flex items-center justify-between">
            <Button variant="sharp" onClick={() => navigate('/')}>
              ← Nova análise
            </Button>
          </header>
          <AgentTimeline agents={agents} />
        </aside>

        <section className="flex flex-col gap-6">
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

          {!result && !error && (
            <div className="flex items-center text-porcelain-text text-lg min-h-[120px]">
              {currentAgent
                ? AGENT_RUNNING_PHRASES[currentAgent]
                : 'Iniciando análise…'}
            </div>
          )}

          {result && (
            <>
              <ReportHero result={result} />
              <div className="flex flex-col gap-4">
                {AGENT_ORDER.map((name) => (
                  <AgentCard
                    key={name}
                    agent={name}
                    output={result.agents[name]}
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
