import type { OverviewResponse } from '../../../lib/stockApi'
import { PriceChart } from '../../PriceChart'
import { KPICard } from '../widgets/KPICard'
import { KPIGrid } from '../widgets/KPIGrid'
import { AboutCard } from '../widgets/AboutCard'
import { PieChartSVG } from '../widgets/PieChartSVG'
import { GaugeWidget } from '../widgets/GaugeWidget'
import { SeasonalsBars } from '../widgets/SeasonalsBars'
import { NewsItem } from '../widgets/NewsItem'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: OverviewResponse | null; loading: boolean; ticker: string }

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1e12) return `R$ ${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `R$ ${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `R$ ${(v / 1e6).toFixed(0)}M`
  return `R$ ${v.toLocaleString('pt-BR')}`
}
function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—'
  return `${v.toFixed(decimals)}%`
}
function fmtNum(v: number | null | undefined, suffix = '×', decimals = 2): string {
  if (v == null) return '—'
  return `${v.toFixed(decimals)}${suffix}`
}

export function OverviewPanel({ data, loading, ticker }: Props) {
  if (loading || !data) {
    return (
      <div>
        <SkeletonCard height={320} />
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} height={80}/>)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <PriceChart ticker={`${ticker}.SA`} height={320} />
      </div>

      <KPIGrid columns={6}>
        <KPICard label="Valor de mercado" value={fmtCurrency(data.kpis.mkt_cap)} />
        <KPICard label="Div. yield" value={fmtPct(data.kpis.div_yield)} />
        <KPICard label="P/L 12M" value={fmtNum(data.kpis.pl_12m)} />
        <KPICard label="EPS 12M" value={data.kpis.eps_12m != null ? `R$ ${data.kpis.eps_12m.toFixed(2)}` : '—'} />
        <KPICard label="Beta" value={fmtNum(data.kpis.beta, '', 2)} />
        <KPICard label="Lucro líq." value={fmtCurrency(data.kpis.last_quarter_profit)} />
      </KPIGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AboutCard summary={data.profile.summary}
          ceo={data.profile.ceo} founded={data.profile.founded}
          employees={data.profile.employees} website={data.profile.website} />

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
            Controle acionário
          </h3>
          <PieChartSVG slices={[
            { label: 'Insiders', value: data.shareholders.closely_held_pct ?? 0,
              color: '#479ffa', sub: fmtPct((data.shareholders.closely_held_pct ?? 0) * 100, 2) },
            { label: 'Free Float', value: data.shareholders.free_float_pct ?? 0,
              color: '#ffa16c', sub: fmtPct((data.shareholders.free_float_pct ?? 0) * 100, 2) },
          ]} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        <div className="glass" style={{ padding: '20px 22px' }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
            Notícias recentes
          </h3>
          {data.news_preview.length === 0
            ? <div style={{ fontSize: 12, color: '#868f97' }}>Sem notícias disponíveis.</div>
            : data.news_preview.slice(0, 4).map((n, i) => (
                <NewsItem key={i} {...n} />
              ))
          }
        </div>

        <div className="glass" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
            Sinais técnicos
          </h3>
          <GaugeWidget signal={data.technicals_summary.signal as any}
            counts={data.technicals_summary.counts}
            periods={{
              today: data.technicals_summary.today,
              week:  data.technicals_summary.week,
              month: data.technicals_summary.month,
            }} />
        </div>
      </div>

      <div className="glass" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
          Sazonalidade (média 5A)
        </h3>
        <SeasonalsBars months={data.seasonals_mini} />
      </div>
    </div>
  )
}
