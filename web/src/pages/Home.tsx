import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TickerInput } from '../components/TickerInput'
import { ErrorBanner } from '../components/ErrorBanner'
import { StockQuickPicks } from '../components/StockQuickPicks'
import { fetchAnalyses } from '../lib/api'

const DEFAULT_TICKERS = [
  'PETR4','VALE3','ITUB4','BBDC4','ABEV3',
  'WEGE3','B3SA3','BBAS3','RENT3','EMBR3',
  'SUZB3','JBSS3','LREN3','GGBR4','RADL3',
  'EQTL3','RDOR3','TOTS3','BPAC11','MGLU3',
]

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
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      padding: '60px 80px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 80,
        width: '100%',
        alignItems: 'center',
      }}>

        {/* Esquerda: hero + formulário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span style={{
              fontFamily: 'monospace', fontSize: 16, textTransform: 'uppercase',
              letterSpacing: '0.14em', color: '#479ffa',
            }}>
              FinSwarm · B3
            </span>
            <h1 style={{
              fontSize: 84, fontWeight: 600, lineHeight: 1.1,
              letterSpacing: '-0.03em', color: '#e6e6e6', margin: 0,
            }}>
              Análise multi-agente para a B3
            </h1>
            <p style={{
              fontSize: 22, lineHeight: 1.55, color: '#cccccc', margin: 0,
            }}>
              Sete agentes LLM avaliam técnico, fundamentos, sentimento e risco
              para produzir uma recomendação fundamentada.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <ErrorBanner message={error} />}
            <TickerInput onSubmit={handleSubmit} large />
          </div>
        </div>

        {/* Direita: grid de ações */}
        <div>
          <StockQuickPicks onSelect={handleSelect} extraTickers={extraTickers} large />
        </div>

      </div>
    </main>
  )
}
