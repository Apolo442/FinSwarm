import { getCompanyMeta } from '../lib/companyMeta'
import { CompanyLogo } from './CompanyLogo'

const DEFAULT_TICKERS = [
  'PETR4','VALE3','ITUB4','BBDC4','ABEV3',
  'WEGE3','B3SA3','BBAS3','RENT3','EMBR3',
  'SUZB3','JBSS3','LREN3','GGBR4','RADL3',
  'EQTL3','RDOR3','TOTS3','BPAC11','MGLU3',
]

interface StockQuickPicksProps {
  onSelect: (ticker: string) => void
  extraTickers?: string[]
  disabled?: boolean
  large?: boolean
}

export function StockQuickPicks({ onSelect, extraTickers = [], disabled = false, large = false }: StockQuickPicksProps) {
  const tickers = [...DEFAULT_TICKERS, ...extraTickers]

  const logoSize    = large ? 64  : 34
  const tickerSize  = large ? 17  : 9
  const nameSize    = large ? 13  : 7
  const cardPad     = large ? '18px 10px' : '10px 6px'
  const cardGap     = large ? 5   : 5
  const gridGap     = large ? 10  : 6
  const radius      = large ? 18  : 10
  const labelSize   = large ? 13  : 9

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: large ? 14 : 8 }}>
      <span style={{ fontFamily: 'monospace', fontSize: labelSize, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#868f97' }}>
        Principais da B3
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: gridGap }}>
        {tickers.map(ticker => {
          const meta = getCompanyMeta(ticker)
          return (
            <button
              key={ticker}
              onClick={() => onSelect(ticker)}
              disabled={disabled}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: cardGap,
                padding: cardPad,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: radius,
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
              <CompanyLogo ticker={ticker} size={logoSize} />
              <span style={{ fontSize: tickerSize, fontWeight: 700, fontFamily: 'monospace', color: '#fff' }}>
                {ticker}
              </span>
              <span style={{ fontSize: nameSize, color: '#868f97', textAlign: 'center', lineHeight: 1.3 }}>
                {meta.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
