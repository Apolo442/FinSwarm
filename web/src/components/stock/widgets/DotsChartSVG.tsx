export interface DotsPoint { period: string; reported?: number | null; estimate?: number | null }
interface Props { data: DotsPoint[]; height?: number }

export function DotsChartSVG({ data, height = 180 }: Props) {
  if (data.length === 0) return null
  const allVals = data.flatMap(d => [d.reported, d.estimate].filter((x): x is number => x != null))
  const max = Math.max(...allVals, 1)
  const min = Math.min(...allVals, 0)
  const range = max - min || 1
  const w = 320 / data.length

  const yFor = (v: number) => height - 30 - ((v - min) / range) * (height - 60)

  return (
    <svg width="100%" height={height} viewBox={`0 0 320 ${height}`}>
      <line x1="0" y1={height/2} x2="320" y2={height/2}
        stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4"/>
      {data.map((d, i) => {
        const x = (i + 0.5) * w
        return (
          <g key={i}>
            {d.reported != null && (
              <circle cx={x} cy={yFor(d.reported)} r="6" fill="#479ffa">
                <title>{d.period}: reportado {d.reported}</title>
              </circle>
            )}
            {d.estimate != null && (
              <circle cx={x} cy={yFor(d.estimate)} r="5" fill="transparent"
                stroke="#ffa16c" strokeWidth="2">
                <title>{d.period}: estimado {d.estimate}</title>
              </circle>
            )}
            <text x={x} y={height - 8} textAnchor="middle"
              fill="#868f97" fontSize="9" fontFamily="monospace">{d.period}</text>
          </g>
        )
      })}
    </svg>
  )
}
