import { useState } from 'react'
import type { SeasonalMonth, SeasonalYear } from '../../../lib/stockApi'

interface Props { avg: SeasonalMonth[]; years: SeasonalYear[] }

const MONTH_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const YEAR_COLORS = ['#479ffa', '#4ebe96', '#f06292', '#00bcd4', '#bb86fc']

function cumulativeReturn(monthData: { month: number; return_pct: number }[]): number[] {
  const sorted = [...monthData].sort((a, b) => a.month - b.month)
  let cum = 100
  return sorted.map(d => { cum *= (1 + d.return_pct / 100); return cum })
}

export function SeasonalsOverlay({ avg, years }: Props) {
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const showAvg = !hidden.has(-1)
  const W = 1200, H = 360, padL = 40, padR = 20

  const avgCum: number[] = []
  let c = 100
  ;[...avg].sort((a, b) => a.month - b.month).forEach(m => {
    c *= (1 + m.avg_return_pct / 100); avgCum.push(c)
  })
  const yearLines = years.map((y, i) => ({
    year: y.year, color: YEAR_COLORS[i % YEAR_COLORS.length],
    points: cumulativeReturn(y.data),
  }))
  const allValues = [...avgCum, ...yearLines.flatMap(y => y.points)]
  const maxV = Math.max(...allValues, 100), minV = Math.min(...allValues, 100)
  const range = maxV - minV || 1

  const xFor = (i: number) => padL + (i / 11) * (W - padL - padR)
  const yFor = (v: number) => 30 + (1 - (v - minV) / range) * (H - 60)

  const pathFor = (pts: number[]) => {
    if (!pts.length) return ''
    return pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`).join(' ')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Chip color="#ffa16c" label="Média 5A" active={showAvg}
          onClick={() => setHidden(h => { const n = new Set(h); n.has(-1) ? n.delete(-1) : n.add(-1); return n })} />
        {yearLines.map(y => (
          <Chip key={y.year} color={y.color} label={String(y.year)}
            active={!hidden.has(y.year)}
            onClick={() => setHidden(h => { const n = new Set(h); n.has(y.year) ? n.delete(y.year) : n.add(y.year); return n })} />
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ height: 380 }}>
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={padL} y1={30 + p * (H - 60)} x2={W - padR} y2={30 + p * (H - 60)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray={p === 0.5 ? '' : '2 4'} />
        ))}
        {yearLines.filter(y => !hidden.has(y.year)).map(y => (
          <path key={y.year} d={pathFor(y.points)} fill="none" stroke={y.color}
            strokeWidth="1.5" opacity="0.4"/>
        ))}
        {showAvg && (
          <path d={pathFor(avgCum)} fill="none" stroke="#ffa16c" strokeWidth="3"/>
        )}
        {MONTH_LABEL.map((m, i) => (
          <text key={i} x={xFor(i)} y={H - 6} textAnchor="middle"
            fontFamily="monospace" fontSize="11" fill="#868f97">{m}</text>
        ))}
      </svg>
    </div>
  )
}

function Chip({ color, label, active, onClick }: { color: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 999, fontFamily: 'monospace', fontSize: 10,
      border: `1px solid ${active ? color + '66' : 'rgba(255,255,255,0.1)'}`,
      background: active ? color + '14' : 'transparent',
      color: active ? '#e6e6e6' : '#868f97', cursor: 'pointer',
    }}>● {label}</button>
  )
}
