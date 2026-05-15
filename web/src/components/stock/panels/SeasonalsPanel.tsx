import type { SeasonalsResponse } from '../../../lib/stockApi'
import { SeasonalsOverlay } from '../widgets/SeasonalsOverlay'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: SeasonalsResponse | null; loading: boolean }

export function SeasonalsPanel({ data, loading }: Props) {
  if (loading || !data) return <SkeletonCard height={480}/>
  return (
    <div className="glass" style={{ padding: '26px 32px' }}>
      <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 18, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
        Comportamento sazonal histórico
      </h3>
      <SeasonalsOverlay avg={data.monthly_avg_5y} years={data.years} />
      <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: 12, color: '#cccccc', lineHeight: 1.6, maxWidth: 880 }}>
        Padrões sazonais mostram o comportamento histórico médio do ativo ao longo do ano.
        Use como referência, não como garantia.
      </div>
    </div>
  )
}
