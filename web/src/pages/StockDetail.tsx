import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TabBar, TabName } from '../components/stock/TabBar'
import { StockHeader } from '../components/stock/StockHeader'
import { OverviewPanel } from '../components/stock/panels/OverviewPanel'
import { FinancialsPanel } from '../components/stock/panels/FinancialsPanel'
import { NewsPanel } from '../components/stock/panels/NewsPanel'
import { CommunityPanel } from '../components/stock/panels/CommunityPanel'
import { TechnicalsPanel } from '../components/stock/panels/TechnicalsPanel'
import { ForecastPanel } from '../components/stock/panels/ForecastPanel'
import { SeasonalsPanel } from '../components/stock/panels/SeasonalsPanel'
import { BondsPanel } from '../components/stock/panels/BondsPanel'
import { ErrorBanner } from '../components/ErrorBanner'
import {
  fetchOverview, fetchFinancials, fetchStockNews,
  fetchTechnicals, fetchForecastData, fetchSeasonals,
} from '../lib/stockApi'
import { useStockData } from '../lib/useStockData'
import { ApiError, postAnalyze } from '../lib/api'

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const tickerBase = (ticker ?? '').toUpperCase().replace(/\.SA$/i, '')
  const tickerSA = `${tickerBase}.SA`

  const [tab, setTab] = useState<TabName>('overview')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overview   = useStockData(tickerBase, 'overview',   fetchOverview)
  const financials = useStockData(tickerBase, 'financials', fetchFinancials,   tab === 'financials')
  const news       = useStockData(tickerBase, 'news',       fetchStockNews,    tab === 'news')
  const technicals = useStockData(tickerBase, 'technicals', fetchTechnicals,   tab === 'technicals')
  const forecast   = useStockData(tickerBase, 'forecast',   fetchForecastData, tab === 'forecast')
  const seasonals  = useStockData(tickerBase, 'seasonals',  fetchSeasonals,    tab === 'seasonals')

  async function handleAnalyze() {
    setSubmitting(true); setError(null)
    try {
      const job = await postAnalyze(tickerSA)
      navigate(`/analysis/${job.job_id}`, { state: { ticker: tickerSA } })
    } catch (e) {
      setError(e instanceof ApiError
        ? `Erro ${e.status}: ${e.message}`
        : 'Não foi possível iniciar a análise.')
      setSubmitting(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '28px 56px 100px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
        <button onClick={() => navigate('/')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          borderRadius: 8, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', color: '#868f97',
          fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
        }}>← Voltar</button>
        <span style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#479ffa' }}>FinSwarm · B3</span>
      </div>

      <StockHeader
        ticker={tickerBase}
        longName={overview.data?.profile.long_name ?? null}
        price={overview.data?.quote.price ?? null}
        change={overview.data?.quote.change ?? null}
        changePct={overview.data?.quote.change_pct ?? null}
        prevClose={overview.data?.quote.prev_close ?? null}
        loading={overview.loading}
      />

      <TabBar active={tab} onChange={setTab}
        newsCount={overview.data?.news_preview?.length}
        communityCount={undefined} />

      {tab === 'overview'   && <OverviewPanel   data={overview.data}   loading={overview.loading}   ticker={tickerBase}/>}
      {tab === 'financials' && <FinancialsPanel data={financials.data} loading={financials.loading}/>}
      {tab === 'news'       && <NewsPanel       data={news.data}       loading={news.loading}/>}
      {tab === 'community'  && <CommunityPanel  ticker={tickerBase}/>}
      {tab === 'technicals' && <TechnicalsPanel data={technicals.data} loading={technicals.loading}/>}
      {tab === 'forecast'   && <ForecastPanel   data={forecast.data}   loading={forecast.loading}/>}
      {tab === 'seasonals'  && <SeasonalsPanel  data={seasonals.data}  loading={seasonals.loading}/>}
      {tab === 'bonds'      && <BondsPanel/>}

      {error && <div style={{ marginTop: 16 }}><ErrorBanner message={error} /></div>}

      <div className="glass-strong" style={{
        position: 'sticky', bottom: 24, padding: '20px 32px', marginTop: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <b style={{ fontSize: 14, color: '#e6e6e6' }}>Pronto para rodar a análise multi-agente?</b>
          <span style={{ fontSize: 11, color: '#868f97' }}>
            7 agentes LLM avaliam técnico, fundamentos, sentimento e risco em ~30s
          </span>
        </div>
        <button onClick={handleAnalyze} disabled={submitting} style={{
          padding: '14px 28px', borderRadius: 12, border: 'none',
          background: submitting
            ? 'rgba(255,161,108,0.3)'
            : 'linear-gradient(135deg, #ffa16c 0%, #ff6b35 100%)',
          color: '#131313', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
          cursor: submitting ? 'not-allowed' : 'pointer',
          boxShadow: '0 8px 24px rgba(255,161,108,0.3)',
        }}>
          {submitting ? 'Iniciando análise...' : `Analisar ${tickerBase} com FinSwarm →`}
        </button>
      </div>
    </main>
  )
}
