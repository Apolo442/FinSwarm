export interface PieSlice { label: string; value: number; color: string; sub?: string }
interface Props { slices: PieSlice[]; size?: number }

export function PieChartSVG({ slices, size = 180 }: Props) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1
  const r = 42, c = 50
  const circumference = 2 * Math.PI * r
  let acc = 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Donut grande centralizado */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx={c} cy={c} r={r} fill="transparent"
            stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
          {slices.map((s, i) => {
            const frac = s.value / total
            const dash = frac * circumference
            const gap = circumference - dash
            const rotate = (acc / total) * 360 - 90
            acc += s.value
            return (
              <circle key={i} cx={c} cy={c} r={r} fill="transparent"
                stroke={s.color} strokeWidth="12"
                strokeDasharray={`${dash} ${gap}`}
                strokeLinecap="round"
                transform={`rotate(${rotate} ${c} ${c})`} />
            )
          })}
        </svg>
        {/* Label central: fatia dominante */}
        {slices.length > 0 && (() => {
          const dominant = [...slices].sort((a, b) => b.value - a.value)[0]
          const pct = (dominant.value / total * 100).toFixed(1)
          return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: dominant.color,
                fontFamily: 'monospace', lineHeight: 1 }}>{pct}%</span>
              <span style={{ fontSize: 10, color: '#868f97', fontFamily: 'monospace',
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dominant.label}</span>
            </div>
          )
        })()}
      </div>

      {/* Legenda horizontal embaixo */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%',
                background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#a0a8b4' }}>{s.label}</span>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#e6e6e6' }}>
              {s.sub ?? `${(s.value / total * 100).toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
