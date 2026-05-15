interface KPICardProps { label: string; value: string; sub?: string }
export function KPICard({ label, value, sub }: KPICardProps) {
  return (
    <div className="glass" style={{
      padding: '16px 12px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 5,
    }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#868f97' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: '#e6e6e6', letterSpacing: '-0.01em' }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: '#868f97', fontFamily: 'monospace' }}>{sub}</span>}
    </div>
  )
}
