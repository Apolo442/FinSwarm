import { CompanyLogo } from '../CompanyLogo'

interface Props {
  ticker: string
  longName: string | null
  price: number | null
  change: number | null
  changePct: number | null
  prevClose: number | null
  loading?: boolean
}

export function StockHeader({ ticker, longName, price, change, changePct, prevClose, loading }: Props) {
  const positive = (change ?? 0) >= 0
  const fmt = (v: number | null) => v != null ? v.toLocaleString('pt-BR',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

  return (
    <div className="glass-strong" style={{
      padding: '24px 32px', marginBottom: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 32, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <CompanyLogo ticker={ticker} size={64} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#868f97' }}>
            {longName || '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 6px' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#e6e6e6',
              letterSpacing: '-0.02em' }}>{ticker}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, padding: '3px 9px',
              background: 'rgba(71,159,250,0.1)', border: '1px solid rgba(71,159,250,0.25)',
              borderRadius: 999, color: '#479ffa', textTransform: 'uppercase' }}>B3 · BMFBOVESPA</span>
          </div>
        </div>
      </div>
      {loading || price == null ? (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}>carregando cotação...</div>
      ) : (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#e6e6e6',
            letterSpacing: '-0.02em', lineHeight: 1 }}>R$ {fmt(price)}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600,
            color: positive ? '#4ebe96' : '#ff6b6b', marginTop: 6 }}>
            {positive ? '+' : ''}{fmt(change)} ({positive ? '+' : ''}{fmt(changePct)}%)
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97', marginTop: 4 }}>
            Fechamento anterior: R$ {fmt(prevClose)}
          </div>
        </div>
      )}
    </div>
  )
}
