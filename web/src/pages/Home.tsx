import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TickerInput } from '../components/TickerInput'
import { ErrorBanner } from '../components/ErrorBanner'
import { StockQuickPicks } from '../components/StockQuickPicks'
import { fetchAnalyses } from '../lib/api'

const DEFAULT_TICKERS = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','B3SA3','BBAS3','MGLU3','RENT3']

export function Home() {
  const navigate = useNavigate()
  const [error, setError]               = useState<string | null>(null)
  const [extraTickers, setExtraTickers] = useState<string[]>([])

  useEffect(() => {
    fetchAnalyses()
      .then(rows => {
        const seen = new Set(DEFAULT_TICKERS)
        const extras: string[] = []
        for (const row of rows) {
          const base = row.ticker.replace(/\.SA$/i, '').toUpperCase()
          if (!seen.has(base)) {
            seen.add(base)
            extras.push(base)
          }
        }
        setExtraTickers(extras)
      })
      .catch(() => {/* silencioso */})
  }, [])

  function handleSubmit(ticker: string) {
    setError(null)
    const base = ticker.trim().replace(/\.SA$/i, '').toUpperCase()
    if (!base) { setError('Digite um ticker válido.'); return }
    navigate(`/stock/${base}`)
  }

  function handleSelect(ticker: string) {
    const base = ticker.replace(/\.SA$/i, '').toUpperCase()
    navigate(`/stock/${base}`)
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto flex flex-col items-start gap-8">

        {/* Hero */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: '#479ffa' }}>
            FinSwarm · B3
          </span>
          <h1 className="text-[56px] font-semibold leading-[1.14] tracking-[-0.036px]" style={{ color: '#e6e6e6' }}>
            Análise multi-agente para a B3
          </h1>
          <p className="text-base max-w-lg" style={{ color: '#cccccc' }}>
            Sete agentes LLM avaliam técnico, fundamentos, sentimento e risco
            para produzir uma recomendação fundamentada.
          </p>
        </div>

        {/* Input */}
        <div className="w-full flex flex-col gap-4">
          {error && <ErrorBanner message={error} />}
          <TickerInput onSubmit={handleSubmit} />
          <StockQuickPicks onSelect={handleSelect} extraTickers={extraTickers} />
        </div>

      </div>
    </main>
  )
}
