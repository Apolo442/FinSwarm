import type { TechnicalsResponse } from '../../../lib/stockApi'
import { GaugeWidget } from '../widgets/GaugeWidget'
import { IndicatorRow } from '../widgets/IndicatorRow'
import { PivotsTable } from '../widgets/PivotsTable'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: TechnicalsResponse | null; loading: boolean }

export function TechnicalsPanel({ data, loading }: Props) {
  if (loading || !data) {
    return <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr 1fr', gap: 16 }}>
      {[1,2,3].map(i => <SkeletonCard key={i} height={380}/>)}
    </div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Resumo geral</h3>
          <GaugeWidget signal={data.summary.signal as any}
            counts={data.summary.counts}
            periods={{ today: data.summary.today, week: data.summary.week, month: data.summary.month }}
            size="lg" />
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Osciladores</h3>
          {data.oscillators.map(i => <IndicatorRow key={i.name} {...i} />)}
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Médias móveis</h3>
          {data.moving_averages.map(i => <IndicatorRow key={i.name} {...i} />)}
        </div>
      </div>

      <div className="glass" style={{ padding: '22px 28px' }}>
        <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>
          Pontos de pivô (diários)
        </h3>
        <PivotsTable pivots={data.pivots} />
      </div>
    </div>
  )
}
