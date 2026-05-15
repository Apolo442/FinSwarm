export type TabName = 'overview' | 'financials' | 'news' | 'technicals' | 'seasonals'

interface Props {
  active: TabName
  onChange: (t: TabName) => void
  newsCount?: number
}

const TABS: { id: TabName; label: string }[] = [
  { id: 'overview',   label: 'Visão geral'    },
  { id: 'financials', label: 'Finanças'       },
  { id: 'news',       label: 'Notícias'       },
  { id: 'technicals', label: 'Sinais técnicos'},
  { id: 'seasonals',  label: 'Sazonais'       },
]

export function TabBar({ active, onChange, newsCount }: Props) {
  return (
    <div role="tablist" className="tabbar-scroll" style={{
      display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '0 32px', background: 'rgba(255,255,255,0.02)',
      backdropFilter: 'blur(20px)', borderRadius: '16px 16px 0 0',
      border: '1px solid rgba(255,255,255,0.07)', marginBottom: 24,
    }}>
      {TABS.map(t => {
        const isActive = active === t.id
        const count = t.id === 'news' ? newsCount : undefined
        return (
          <button key={t.id} role="tab" aria-selected={isActive}
            onClick={() => onChange(t.id)}
            style={{
              padding: '16px 22px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              color: isActive ? '#ffa16c' : '#868f97', background: 'transparent',
              border: 'none', borderBottom: `2px solid ${isActive ? '#ffa16c' : 'transparent'}`,
              fontWeight: isActive ? 600 : 400, position: 'relative', top: 1,
              transition: 'all 0.15s',
            }}>
            {t.label}
            {count != null && count > 0 && (
              <span style={{ fontFamily: 'monospace', fontSize: 9, opacity: 0.6,
                marginLeft: 4 }}>{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
