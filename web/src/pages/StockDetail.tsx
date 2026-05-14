import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CompanyLogo } from '../components/CompanyLogo'
import { PriceChart } from '../components/PriceChart'
import { ErrorBanner } from '../components/ErrorBanner'
import { fetchQuote, type QuoteData, postAnalyze, ApiError } from '../lib/api'
import { getCompanyMeta } from '../lib/companyMeta'

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtMarketCap(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1e12) return `R$ ${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `R$ ${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `R$ ${(n / 1e6).toFixed(0)}M`
  return `R$ ${n.toLocaleString('pt-BR')}`
}

function fmtVolume(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toLocaleString('pt-BR')
}

interface StatCardProps {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 100,
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#868f97' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#e6e6e6' }}>{value}</span>
    </div>
  )
}

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const [quote, setQuote]       = useState<QuoteData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const tickerBase = (ticker ?? '').toUpperCase().replace(/\.SA$/i, '')
  const tickerSA   = `${tickerBase}.SA`
  const meta       = getCompanyMeta(tickerBase)

  useEffect(() => {
    setLoading(true)
    fetchQuote(tickerSA)
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setLoading(false))
  }, [tickerSA])

  async function handleAnalyze() {
    setSubmitting(true)
    setError(null)
    try {
      const job = await postAnalyze(tickerSA)
      navigate(`/analysis/${job.job_id}`, { state: { ticker: tickerSA } })
    } catch (e) {
      if (e instanceof ApiError) {
        setError(`Erro ${e.status}: ${e.message}`)
      } else {
        setError('Não foi possível iniciar a análise. Verifique sua conexão.')
      }
      setSubmitting(false)
    }
  }

  const positive = (quote?.change ?? 0) >= 0

  return (
    <main style={{ minHeight: '100vh', padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '6px 14px',
            color: '#868f97', fontFamily: 'monospace', fontSize: 11,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e6e6e6')}
          onMouseLeave={e => (e.currentTarget.style.color = '#868f97')}
        >
          ← Voltar
        </button>
        <span style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#479ffa' }}>FinSwarm · B3</span>
      </div>

      {/* Header card */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
      }}>
        {/* Left: logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <CompanyLogo ticker={tickerBase} size={56} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#e6e6e6', letterSpacing: '-0.02em' }}>
                {tickerBase}
              </span>
              <span style={{
                fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
                letterSpacing: '0.1em', padding: '2px 8px',
                background: 'rgba(71,159,250,0.1)',
                border: '1px solid rgba(71,159,250,0.25)',
                borderRadius: 999, color: '#479ffa',
              }}>B3</span>
            </div>
            <span style={{ fontSize: 13, color: '#868f97' }}>
              {quote?.short_name ?? meta.name}
            </span>
          </div>
        </div>

        {/* Right: price */}
        {loading ? (
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#868f97' }}
            className="animate-pulse-blue">carregando cotação...</div>
        ) : quote ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#e6e6e6', letterSpacing: '-0.02em' }}>
              R$ {fmt(quote.price)}
            </span>
            <span style={{
              fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
              color: positive ? '#4ebe96' : '#ff6b6b',
            }}>
              {positive ? '+' : ''}{fmt(quote.change)} ({positive ? '+' : ''}{fmt(quote.change_pct)}%)
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>
              Fechamento anterior: R$ {fmt(quote.prev_close)}
            </span>
          </div>
        ) : (
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}>
            cotação indisponível
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
      }}>
        <PriceChart ticker={tickerSA} height={280} />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Mkt Cap"   value={fmtMarketCap(quote?.market_cap ?? null)} />
        <StatCard label="Volume"    value={fmtVolume(quote?.volume ?? null)} />
        <StatCard label="P/L"       value={quote?.pl != null ? fmt(quote.pl, 1) + 'x' : '—'} />
        <StatCard label="P/VP"      value={quote?.pvp != null ? fmt(quote.pvp, 2) + 'x' : '—'} />
        <StatCard label="Div. Yld"  value={quote?.dy != null ? fmt(quote.dy, 2) + '%' : '—'} />
      </div>

      {/* Error */}
      {error && <div style={{ marginBottom: 16 }}><ErrorBanner message={error} /></div>}

      {/* CTA */}
      <button
        onClick={handleAnalyze}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '16px 24px',
          borderRadius: 12,
          border: 'none',
          background: submitting
            ? 'rgba(255,161,108,0.3)'
            : 'linear-gradient(135deg, rgba(255,161,108,0.85) 0%, rgba(255,130,60,0.9) 100%)',
          color: '#131313',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
        onMouseEnter={e => {
          if (!submitting) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        }}
      >
        {submitting ? 'Iniciando análise...' : `Analisar ${tickerBase} com FinSwarm →`}
      </button>

    </main>
  )
}
