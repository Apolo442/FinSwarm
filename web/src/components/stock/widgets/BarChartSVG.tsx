import { useState } from "react"

export interface BarDatum { label: string; value: number; color?: string }
interface Props { data: BarDatum[]; height?: number; format?: (v: number) => string }

export function BarChartSVG({ data, height = 160, format }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 100 / data.length
  const fmt = format || ((v) => v.toLocaleString("pt-BR"))

  return (
    <div style={{ position: "relative", height }}>
      <svg width="100%" height="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 20)
          const x = i * w + w * 0.15
          const bw = w * 0.7
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={height - h - 18} width={bw} height={h}
                fill={d.color || "#ffa16c"} rx="2" opacity={hover === i ? 1 : 0.85}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }} />
              <text x={x + bw/2} y={height - 4} textAnchor="middle"
                fill="#868f97" fontSize="9" fontFamily="monospace">{d.label}</text>
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div style={{
          position: "absolute", top: 4, left: `${(hover + 0.5) * w}%`, transform: "translateX(-50%)",
          background: "rgba(19,19,19,0.95)", border: "1px solid rgba(255,255,255,0.1)",
          padding: "6px 10px", borderRadius: 6, fontSize: 11, color: "#e6e6e6",
          fontFamily: "monospace", pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          <div style={{ color: "#868f97", fontSize: 9 }}>{data[hover].label}</div>
          <div>{fmt(data[hover].value)}</div>
        </div>
      )}
    </div>
  )
}
