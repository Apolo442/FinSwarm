import type { SeasonalMonth } from '../../../lib/stockApi'

interface Props { months: SeasonalMonth[] }

const MONTH_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function SeasonalsBars({ months }: Props) {
  if (!months.length) return null
  const max = Math.max(...months.map(m => Math.abs(m.avg_return_pct)), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4,
      height: 140, alignItems: 'end' }}>
      {months.map((m) => {
        const pos = m.avg_return_pct >= 0
        const h = (Math.abs(m.avg_return_pct) / max) * 100
        return (
          <div key={m.month} style={{ display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%', minHeight: 2, height: `${h}px`,
              borderRadius: pos ? '3px 3px 0 0' : '0 0 3px 3px',
              background: pos
                ? 'linear-gradient(to top, #4ebe96, rgba(78,190,150,0.4))'
                : 'linear-gradient(to bottom, #ff6b6b, rgba(255,107,107,0.4))',
            }}/>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97' }}>
              {MONTH_LABEL[m.month - 1]}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 8,
              color: pos ? '#4ebe96' : '#ff6b6b' }}>
              {pos ? '+' : ''}{m.avg_return_pct.toFixed(1)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}
