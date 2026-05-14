import { getCompanyMeta } from '../lib/companyMeta'

const TICKERS = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','B3SA3','BBAS3','MGLU3','RENT3']

interface StockQuickPicksProps {
  onSelect: (ticker: string) => void
  disabled?: boolean
}

export function StockQuickPicks({ onSelect, disabled = false }: StockQuickPicksProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#868f97' }}>
        Principais da B3
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {TICKERS.map(ticker => {
          const meta = getCompanyMeta(ticker)
          return (
            <button
              key={ticker}
              onClick={() => onSelect(`${ticker}.SA`)}
              disabled={disabled}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '10px 6px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!disabled) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(134,143,151,0.4)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(134,143,151,0.07)'
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
                color: '#479ffa',
                background: 'rgba(71,159,250,0.08)',
                border: '1px solid rgba(71,159,250,0.16)',
              }}>
                {meta.initials}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace', color: '#fff' }}>
                {ticker}
              </span>
              <span style={{ fontSize: 7, color: '#868f97', textAlign: 'center', lineHeight: 1.3 }}>
                {meta.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
