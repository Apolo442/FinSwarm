interface PivotRow {
  method: string; p: number | null
  r1: number | null; r2: number | null; r3: number | null
  s1: number | null; s2: number | null; s3: number | null
}
interface Props { pivots: PivotRow[] }
const METHOD_LABELS: Record<string, string> = {
  classic: 'Clássico', fibonacci: 'Fibonacci',
  camarilla: 'Camarilla', woodie: 'Woodie', demark: 'DeMark',
}
export function PivotsTable({ pivots }: Props) {
  const fmt = (v: number | null) => v != null ? v.toFixed(2) : '—'
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 1fr)', gap: 10,
        padding: '9px 12px', color: '#868f97', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.1em', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace' }}>
        <span>Tipo</span><span>S3</span><span>S2</span><span>S1</span>
        <span>P</span><span>R1</span><span>R2</span><span>R3</span>
      </div>
      {pivots.map((p) => (
        <div key={p.method} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 1fr)', gap: 10,
          padding: '9px 12px', fontFamily: 'monospace', fontSize: 11,
          color: '#cccccc', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#e6e6e6', fontWeight: 600 }}>{METHOD_LABELS[p.method] || p.method}</span>
          <span>{fmt(p.s3)}</span><span>{fmt(p.s2)}</span><span>{fmt(p.s1)}</span>
          <span style={{ color: '#ffa16c', fontWeight: 700 }}>{fmt(p.p)}</span>
          <span>{fmt(p.r1)}</span><span>{fmt(p.r2)}</span><span>{fmt(p.r3)}</span>
        </div>
      ))}
    </div>
  )
}
