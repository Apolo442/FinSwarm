import { useState } from 'react'
import type { FinancialsResponse } from '../../../lib/stockApi'
import { KPICard } from '../widgets/KPICard'
import { KPIGrid } from '../widgets/KPIGrid'
import { BarChartSVG } from '../widgets/BarChartSVG'
import { PieChartSVG } from '../widgets/PieChartSVG'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: FinancialsResponse | null; loading: boolean }

const SUBTABS = ['Visão geral', 'Demonstrações', 'Estatísticas', 'Dividendos', 'Resultados', 'Receita']

function fmtCurr(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1e12) return `R$ ${(v/1e12).toFixed(1)}T`
  if (v >= 1e9)  return `R$ ${(v/1e9).toFixed(1)}B`
  if (v >= 1e6)  return `R$ ${(v/1e6).toFixed(0)}M`
  return `R$ ${v.toLocaleString('pt-BR')}`
}
function fmtPct(v: number | null, d = 2): string { return v != null ? `${(v*100).toFixed(d)}%` : '—' }

export function FinancialsPanel({ data, loading }: Props) {
  const [active, setActive] = useState(0)
  if (loading || !data) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} height={220}/>)}
    </div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {SUBTABS.map((label, i) => (
          <button key={label} onClick={() => setActive(i)} style={{
            padding: '7px 16px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
            background: i === active ? 'rgba(71,159,250,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${i === active ? 'rgba(71,159,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: i === active ? '#479ffa' : '#868f97',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Fatos principais</h3>
          <KPIGrid columns={2}>
            <KPICard label="Mkt Cap" value={fmtCurr(data.facts.mkt_cap)} />
            <KPICard label="Div. Yld" value={fmtPct(data.facts.div_yield)} />
            <KPICard label="P/L 12M" value={data.facts.pl_12m != null ? `${data.facts.pl_12m.toFixed(2)}×` : '—'} />
            <KPICard label="EPS 12M" value={data.facts.eps_12m != null ? `R$ ${data.facts.eps_12m.toFixed(2)}` : '—'} />
          </KPIGrid>
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Estrutura de capital</h3>
          <BarChartSVG data={[
            { label: 'Mkt Cap', value: data.capital_structure.mkt_cap ?? 0, color: '#479ffa' },
            { label: 'Dívida',  value: data.capital_structure.debt ?? 0, color: '#ffa16c' },
            { label: 'Caixa',   value: data.capital_structure.cash ?? 0, color: '#4ebe96' },
            { label: 'EV',      value: data.capital_structure.enterprise_value ?? 0, color: '#00bcd4' },
          ]} format={fmtCurr} />
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Valoração</h3>
          <PieChartSVG slices={[
            { label: 'Receita', value: data.valuation.revenue ?? 0, color: '#479ffa', sub: fmtCurr(data.valuation.revenue) },
            { label: 'Luc. líq.', value: data.valuation.net_income ?? 0, color: '#ffa16c', sub: fmtCurr(data.valuation.net_income) },
          ]} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Crescimento (receita)</h3>
          <BarChartSVG data={data.growth.map(g => ({
            label: String(g.year), value: g.revenue ?? 0, color: '#ffa16c'
          }))} format={fmtCurr}/>
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Rentabilidade</h3>
          {(['roe','roa','net_margin','ebit_margin'] as const).map(k => (
            <div key={k} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#cccccc' }}>{k.toUpperCase().replace('_',' ')}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4ebe96', fontWeight: 700 }}>
                  {fmtPct(data.profitability[k], 1)}
                </span>
              </div>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                <span style={{ display: 'block', height: '100%', borderRadius: 999,
                  width: `${Math.min(Math.abs((data.profitability[k] ?? 0) * 100 * 4), 100)}%`,
                  background: 'linear-gradient(90deg, #4ebe96, rgba(78,190,150,0.5))' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Dividendos</h3>
          <BarChartSVG data={data.dividends_history.map(d => ({
            label: String(d.year), value: d.dps ?? 0, color: '#f06292'
          }))} format={(v) => `R$ ${v.toFixed(2)}`} />
        </div>
      </div>
    </div>
  )
}
