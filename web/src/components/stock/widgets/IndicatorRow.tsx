interface Props { name: string; value: number | null; signal: string }
const COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  BUY:     { bg: 'rgba(78,190,150,0.12)', fg: '#4ebe96', label: 'Compra' },
  SELL:    { bg: 'rgba(255,107,107,0.12)', fg: '#ff6b6b', label: 'Venda' },
  NEUTRAL: { bg: 'rgba(134,143,151,0.15)', fg: '#868f97', label: 'Neutro' },
}
export function IndicatorRow({ name, value, signal }: Props) {
  const c = COLORS[signal] || COLORS.NEUTRAL
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 10, alignItems: 'center',
      padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 12, color: '#cccccc' }}>{name}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e6e6e6', textAlign: 'right' }}>
        {value != null ? value : '—'}
      </span>
      <span style={{ justifySelf: 'end', padding: '3px 9px', borderRadius: 999,
        fontSize: 9, fontFamily: 'monospace', fontWeight: 700, background: c.bg, color: c.fg }}>
        {c.label}
      </span>
    </div>
  )
}
