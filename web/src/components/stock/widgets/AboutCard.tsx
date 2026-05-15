import { useState } from 'react'
interface AboutCardProps {
  summary: string | null; ceo: string | null; founded: number | null
  employees: number | null; website: string | null
}
export function AboutCard({ summary, ceo, founded, employees, website }: AboutCardProps) {
  const [open, setOpen] = useState(false)
  const text = summary || 'Sem descrição disponível.'
  const truncated = text.length > 320 && !open ? text.slice(0, 320) + '…' : text
  const fmtNum = (n: number | null) => n ? n.toLocaleString('pt-BR') : '—'
  return (
    <div className="glass" style={{ padding: 22 }}>
      <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 12, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/> Sobre a empresa
      </h3>
      <p style={{ fontSize: 12, color: '#cccccc', lineHeight: 1.7 }}>{truncated}</p>
      {text.length > 320 && (
        <button onClick={() => setOpen(o => !o)}
          style={{ marginTop: 10, background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 10, color: '#479ffa' }}>
          {open ? '▴ Mostrar menos' : 'Mostrar mais ▾'}
        </button>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14,
        paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {[['Fundada em', founded ? String(founded) : '—'],
          ['CEO', ceo || '—'],
          ['Colaboradores', fmtNum(employees)],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
              color: '#868f97', letterSpacing: '0.1em' }}>{label}</span>
            <span style={{ fontSize: 12, color: '#e6e6e6', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
        {website && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
              color: '#868f97', letterSpacing: '0.1em' }}>Site</span>
            <a href={website} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#479ffa', fontWeight: 600 }}>{website}</a>
          </div>
        )}
      </div>
    </div>
  )
}
