import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TickerInput } from '../components/TickerInput'
import { ErrorBanner } from '../components/ErrorBanner'
import { HistoryDrawer } from '../components/HistoryDrawer'
import { HistoryModal } from '../components/HistoryModal'
import { ApiError, postAnalyze } from '../lib/api'

export function Home() {
  const navigate = useNavigate()
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  async function handleSubmit(ticker: string) {
    setSubmitting(true)
    setError(null)
    try {
      const job = await postAnalyze(ticker)
      navigate(`/analysis/${job.job_id}`, { state: { ticker } })
    } catch (e) {
      if (e instanceof ApiError) {
        setError(`Erro ${e.status}: ${e.message}`)
      } else {
        setError('Não foi possível iniciar a análise. Verifique sua conexão.')
      }
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-[1216px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">

          {/* Coluna esquerda: hero + input */}
          <div className="flex flex-col items-start gap-8">
            <div className="flex flex-col gap-4">
              <span className="font-mono text-[11px] uppercase tracking-widest text-data-blue">
                FinSwarm · B3
              </span>
              <h1 className="text-[56px] font-semibold leading-[1.14] tracking-[-0.036px] text-polar-white">
                Análise multi-agente para a B3
              </h1>
              <p className="text-base text-silver-dust max-w-lg">
                Sete agentes LLM avaliam técnico, fundamentos, sentimento e risco
                para produzir uma recomendação fundamentada.
              </p>
            </div>
            <div className="w-full flex flex-col gap-3">
              {error && <ErrorBanner message={error} />}
              <TickerInput onSubmit={handleSubmit} disabled={submitting} />
            </div>
          </div>

          {/* Coluna direita: histórico */}
          <aside className="lg:sticky lg:top-8 lg:self-start h-[calc(100vh-96px)] flex flex-col">
            <HistoryDrawer onSelect={setSelectedJobId} />
          </aside>

        </div>
      </div>

      <HistoryModal jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </main>
  )
}
