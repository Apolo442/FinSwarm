import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TickerInput } from '../components/TickerInput'
import { ErrorBanner } from '../components/ErrorBanner'
import { ApiError, postAnalyze } from '../lib/api'

export function Home() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(ticker: string) {
    setSubmitting(true)
    setError(null)
    try {
      const job = await postAnalyze(ticker)
      navigate(`/analysis/${job.job_id}`)
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
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[1216px] flex flex-col items-center gap-8 text-center">
        <h1 className="font-ivy text-[88px] leading-none text-pure-white tracking-tight">
          Análise multi-agente para a B3
        </h1>
        <p className="text-xl text-porcelain-text max-w-2xl">
          Sete agentes LLM avaliam técnico, fundamentos, sentimento e risco do ativo
          para produzir uma recomendação em minutos.
        </p>
        <div className="w-full max-w-xl flex flex-col gap-3 items-center">
          {error && <ErrorBanner message={error} />}
          <TickerInput onSubmit={handleSubmit} disabled={submitting} />
        </div>
      </div>
    </main>
  )
}
