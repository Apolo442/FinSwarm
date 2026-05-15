interface Props {
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'
  counts?: Record<string, number>
  periods?: { today: string; week: string; month: string }
  size?: 'sm' | 'lg'
}

const ANGLES = { STRONG_SELL: -75, SELL: -40, NEUTRAL: 0, BUY: 40, STRONG_BUY: 75 }
const LABELS = {
  STRONG_SELL: 'VIÉS DE BAIXA FORTE', SELL: 'TENDÊNCIA DE BAIXA',
  NEUTRAL: 'TENDÊNCIA NEUTRA',
  BUY: 'VIÉS DE ALTA', STRONG_BUY: 'VIÉS DE ALTA FORTE',
}
const COLORS = {
  STRONG_SELL: '#ff6b6b', SELL: '#ff6b6b',
  NEUTRAL: '#868f97', BUY: '#4ebe96', STRONG_BUY: '#4ebe96',
}

export function GaugeWidget({ signal, counts, periods, size = 'sm' }: Props) {
  const angle = ANGLES[signal] ?? 0
  const color = COLORS[signal]
  const svgW = size === 'lg' ? 280 : 220
  const svgH = size === 'lg' ? 160 : 130

  const x2 = 110 + Math.cos((angle - 90) * Math.PI / 180) * 70
  const y2 = 110 + Math.sin((angle - 90) * Math.PI / 180) * 70

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={svgW} height={svgH} viewBox="0 0 220 130">
        <defs>
          <linearGradient id="gaugeArc" x1="0" x2="1">
            <stop offset="0%" stopColor="#ff6b6b"/>
            <stop offset="50%" stopColor="#868f97"/>
            <stop offset="100%" stopColor="#4ebe96"/>
          </linearGradient>
        </defs>
        <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={size === 'lg' ? 22 : 18} strokeLinecap="round"/>
        <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none"
          stroke="url(#gaugeArc)" strokeWidth={size === 'lg' ? 22 : 18}
          strokeLinecap="round" opacity="0.75"/>
        <line x1="110" y1="110" x2={x2} y2={y2}
          stroke={color} strokeWidth={size === 'lg' ? 4 : 3} strokeLinecap="round"/>
        <circle cx="110" cy="110" r={size === 'lg' ? 8 : 6} fill={color}/>
        <circle cx="110" cy="110" r={size === 'lg' ? 4 : 3} fill="#131313"/>
      </svg>
      <div style={{ fontSize: size === 'lg' ? 24 : 18, fontWeight: 800,
        color, letterSpacing: '0.02em' }}>{LABELS[signal]}</div>
      {counts && (
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>
          {counts.SELL || 0} venda · {counts.NEUTRAL || 0} neutro · {counts.BUY || 0} compra
        </div>
      )}
      {periods && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%',
          paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {(['today','week','month'] as const).map(p => {
            const lbl = { today: 'Hoje', week: '1 semana', month: '1 mês' }[p]
            const sig = periods[p] as keyof typeof COLORS
            return (
              <div key={p} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97' }}>{lbl}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS[sig] || '#868f97' }}>
                  {sig.replace('_', ' ')}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
