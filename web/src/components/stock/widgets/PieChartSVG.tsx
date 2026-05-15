export interface PieSlice { label: string; value: number; color: string; sub?: string }
interface Props { slices: PieSlice[]; size?: number }

export function PieChartSVG({ slices, size = 130 }: Props) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1
  const r = 40, c = 50
  const circumference = 2 * Math.PI * r
  let acc = 0

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx={c} cy={c} r={r} fill="transparent"
          stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        {slices.map((s, i) => {
          const frac = s.value / total
          const dash = frac * circumference
          const gap = circumference - dash
          const rotate = (acc / total) * 360 - 90
          acc += s.value
          return (
            <circle key={i} cx={c} cy={c} r={r} fill="transparent"
              stroke={s.color} strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotate} ${c} ${c})`} />
          )
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#cccccc" }}>{s.label}</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#e6e6e6" }}>
                {s.sub ?? `${(s.value / total * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
