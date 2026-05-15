import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TabBar, TabName } from '../components/stock/TabBar'
import { StockHeader } from '../components/stock/StockHeader'
import { OverviewPanel } from '../components/stock/panels/OverviewPanel'
import { FinancialsPanel } from '../components/stock/panels/FinancialsPanel'
import { NewsPanel } from '../components/stock/panels/NewsPanel'
import { TechnicalsPanel } from '../components/stock/panels/TechnicalsPanel'
import { SeasonalsPanel } from '../components/stock/panels/SeasonalsPanel'
import { ErrorBanner } from '../components/ErrorBanner'
import {
  fetchOverview, fetchFinancials, fetchStockNews,
  fetchTechnicals, fetchSeasonals,
} from '../lib/stockApi'
import { useStockData } from '../lib/useStockData'
import { ApiError, postAnalyze, fetchAnalyses } from '../lib/api'

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const tickerBase = (ticker ?? '').toUpperCase().replace(/\.SA$/i, '')
  const tickerSA = `${tickerBase}.SA`

  const [tab, setTab] = useState<TabName>('overview')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastJobId, setLastJobId] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalyses()
      .then(rows => {
        const match = rows
          .filter(r => r.ticker.replace(/\.SA$/i, '').toUpperCase() === tickerBase)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
        if (match) setLastJobId(match.job_id)
      })
      .catch(() => { /* silencia — botão simplesmente não aparece */ })
  }, [tickerBase])

  const overview   = useStockData(tickerBase, 'overview',   fetchOverview)
  const financials = useStockData(tickerBase, 'financials', fetchFinancials,   tab === 'financials')
  const news       = useStockData(tickerBase, 'news',       fetchStockNews,    tab === 'news')
  const technicals = useStockData(tickerBase, 'technicals', fetchTechnicals, tab === 'technicals')
  const seasonals  = useStockData(tickerBase, 'seasonals',  fetchSeasonals,  tab === 'seasonals')

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
        lastJobId={lastJobId}
        onAnalyze={handleAnalyze}
        submitting={submitting}
      />

      <TabBar active={tab} onChange={setTab}
        newsCount={overview.data?.news_preview?.length} />

      {tab === 'overview'   && <OverviewPanel   data={overview.data}   loading={overview.loading}   ticker={tickerBase}/>}
      {tab === 'financials' && <FinancialsPanel data={financials.data} loading={financials.loading}/>}
      {tab === 'news'       && <NewsPanel       data={news.data}       loading={news.loading}/>}
      {tab === 'technicals' && <TechnicalsPanel data={technicals.data} loading={technicals.loading}/>}
      {tab === 'seasonals'  && <SeasonalsPanel  data={seasonals.data}  loading={seasonals.loading}/>}

      {error && <div style={{ marginTop: 16 }}><ErrorBanner message={error} /></div>}
    </main>
  )
}
