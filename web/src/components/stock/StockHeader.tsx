import { useNavigate } from 'react-router-dom'
import { CompanyLogo } from '../CompanyLogo'

interface Props {
  ticker: string
  longName: string | null
  price: number | null
  change: number | null
  changePct: number | null
  prevClose: number | null
  loading?: boolean
  lastJobId?: string | null
  onAnalyze: () => void
  submitting?: boolean
}

export function StockHeader({ ticker, longName, price, change, changePct, prevClose, loading, lastJobId, onAnalyze, submitting }: Props) {
  const navigate = useNavigate()
  const positive = (change ?? 0) >= 0
  const fmt = (v: number | null) => v != null ? v.toLocaleString('pt-BR',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

  return (
    <div className="glass-strong" style={{
      padding: '20px 32px', marginBottom: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 32, flexWrap: 'wrap',
    }}>
      {/* esquerda: logo + identificação + preço */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <CompanyLogo ticker={ticker} size={56} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#868f97', marginBottom: 2 }}>
            {longName || '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#e6e6e6',
                letterSpacing: '-0.02em' }}>{ticker}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, padding: '3px 9px',
                background: 'rgba(71,159,250,0.1)', border: '1px solid rgba(71,159,250,0.25)',
                borderRadius: 999, color: '#479ffa', textTransform: 'uppercase' }}>B3</span>
            </div>
            {!loading && price != null && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#e6e6e6',
                  letterSpacing: '-0.02em' }}>R$ {fmt(price)}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
                  color: positive ? '#4ebe96' : '#ff6b6b' }}>
                  {positive ? '+' : ''}{fmt(changePct)}%
                </span>
              </div>
            )}
            {loading && (
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}>
                carregando...
              </span>
            )}
          </div>
          {!loading && prevClose != null && (
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97', marginTop: 3 }}>
              Fechamento anterior: R$ {fmt(prevClose)}
            </div>
          )}
        </div>
      </div>

      {/* direita: botões empilhados */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
        {lastJobId && (
          <button
            onClick={() => navigate(`/analysis/${lastJobId}`)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12,
              background: '#b8bfc8',
              border: 'none',
              color: '#131313', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Último relatório FinSwarm
          </button>
        )}
        <button
          onClick={onAnalyze}
          disabled={submitting}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 12, border: 'none',
            background: submitting
              ? 'rgba(255,161,108,0.3)'
              : 'linear-gradient(135deg, #ffa16c 0%, #ff6b35 100%)',
            color: '#131313', fontSize: 13, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: submitting ? 'none' : '0 6px 20px rgba(255,161,108,0.3)',
            transition: 'opacity 0.15s',
          }}
        >
          {submitting ? 'Iniciando análise...' : `Analisar ${ticker} com FinSwarm →`}
        </button>
      </div>
    </div>
  )
}
