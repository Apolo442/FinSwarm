import type { ForecastResponse } from '../../../lib/stockApi'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: ForecastResponse | null; loading: boolean }

const REC_LABELS: Record<string, string> = {
  strong_buy: 'Compra forte', buy: 'Compra',
  hold: 'Neutro', sell: 'Venda', strong_sell: 'Venda forte',
}
const REC_COLORS: Record<string, string> = {
  strong_buy: '#4ebe96', buy: 'rgba(78,190,150,0.55)',
  hold: '#868f97', sell: 'rgba(255,107,107,0.5)', strong_sell: '#ff6b6b',
}

export function ForecastPanel({ data, loading }: Props) {
  if (loading || !data) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <SkeletonCard height={320}/><SkeletonCard height={320}/>
    </div>
  }
  const t = data.price_target
  const current = t.current ?? 0
  const upside = t.target_mean ? ((t.target_mean - current) / current * 100) : null
  const maxCount = Math.max(...Object.values(data.recommendations), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 18, fontWeight: 600 }}>
            Preço-alvo de analistas
          </h3>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: '#ffa16c', letterSpacing: '-0.02em' }}>
              R$ {t.target_mean ? t.target_mean.toFixed(2) : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#868f97', fontFamily: 'monospace', marginTop: 2 }}>
              Médio · {upside != null ? `${upside > 0 ? '+' : ''}${upside.toFixed(1)}%` : '—'} vs atual
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ff6b6b' }}>
                R$ {t.target_low?.toFixed(0) ?? '—'}
              </div>
              <div style={{ fontSize: 9, color: '#868f97' }}>mín</div>
            </div>
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '12%', right: '8%', height: '100%', borderRadius: 999,
                background: 'linear-gradient(90deg, #ff6b6b, #ffa16c, #4ebe96)' }} />
              <div style={{ position: 'absolute', top: -5, left: '30%', width: 16, height: 16,
                borderRadius: '50%', background: '#ffa16c', border: '3px solid #131313',
                boxShadow: '0 0 12px rgba(255,161,108,0.6)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4ebe96' }}>
                R$ {t.target_high?.toFixed(0) ?? '—'}
              </div>
              <div style={{ fontSize: 9, color: '#868f97' }}>máx</div>
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 18, fontWeight: 600 }}>
            Classificação de analistas
          </h3>
          {Object.entries(REC_LABELS).map(([key, label]) => {
            const count = data.recommendations[key] || 0
            const pct = (count / maxCount) * 100
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 30px',
                gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#868f97' }}>{label}</span>
                <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 999,
                    width: `${pct}%`, background: REC_COLORS[key] }} />
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e6e6e6', textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
