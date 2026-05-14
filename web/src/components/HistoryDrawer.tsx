import { useEffect, useState } from 'react'
import type { AnalysisRow, Recommendation } from '../lib/types'
import { fetchAnalyses } from '../lib/api'
import { getCompanyMeta } from '../lib/companyMeta'

interface HistoryDrawerProps {
  onSelect: (jobId: string) => void
}

type Filter = 'ALL' | Recommendation

const REC_CHIP: Record<Recommendation, string> = {
  COMPRAR: 'border-[rgba(78,190,150,0.22)] text-[#4ebe96] bg-[rgba(78,190,150,0.1)]',
  MANTER:  'border-[rgba(233,168,74,0.2)]  text-[#e9a84a] bg-[rgba(233,168,74,0.1)]',
  VENDER:  'border-[rgba(224,84,84,0.2)]   text-[#e05454] bg-[rgba(224,84,84,0.1)]',
}

const REC_LABEL: Record<Recommendation, string> = {
  COMPRAR: 'comprar',
  MANTER:  'manter',
  VENDER:  'vender',
}

const REC_BAR_COLOR: Record<Recommendation, string> = {
  COMPRAR: '#4ebe96',
  MANTER:  '#e9a84a',
  VENDER:  '#e05454',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = now.toDateString() === d.toDateString()
  if (sameDay) return `hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (yesterday.toDateString() === d.toDateString()) return 'ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'Todas',   value: 'ALL' },
  { label: 'Comprar', value: 'COMPRAR' },
  { label: 'Manter',  value: 'MANTER' },
  { label: 'Vender',  value: 'VENDER' },
]

export function HistoryDrawer({ onSelect }: HistoryDrawerProps) {
  const [rows, setRows]     = useState<AnalysisRow[]>([])
  const [error, setError]   = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  useEffect(() => {
    fetchAnalyses().then(setRows).catch(() => setError(true))
  }, [])

  const filtered = rows.filter(r => {
    const matchRec    = filter === 'ALL' || r.recommendation === filter
    const matchSearch = r.ticker.includes(search.trim().toUpperCase())
    return matchRec && matchSearch
  })

  return (
    <div className="glass rounded-lg flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#868f97' }}>
          Histórico
        </span>
        <span className="font-mono text-[11px] tabular-nums" style={{ color: '#479ffa' }}>{filtered.length}</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <input
          type="text"
          placeholder="Buscar ticker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-md px-3 py-1.5 font-mono text-[12px] focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
            color: '#ffffff',
          }}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3 pt-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md border transition-colors"
            style={{
              borderColor: filter === f.value ? 'rgba(71,159,250,0.4)' : 'rgba(255,255,255,0.1)',
              color: filter === f.value ? '#479ffa' : '#868f97',
              background: filter === f.value ? 'rgba(71,159,250,0.08)' : 'transparent',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 min-h-0">
        {error && (
          <p className="font-mono text-[10px] text-center mt-4" style={{ color: '#e05454' }}>
            Erro ao carregar histórico
          </p>
        )}
        {!error && rows.length === 0 && (
          <p className="font-mono text-[10px] text-center mt-8" style={{ color: '#868f97' }}>
            Nenhuma análise ainda
          </p>
        )}
        {!error && rows.length > 0 && filtered.length === 0 && (
          <p className="font-mono text-[10px] text-center mt-8" style={{ color: '#868f97' }}>
            Nenhum resultado
          </p>
        )}
        {filtered.map(row => {
          const meta = getCompanyMeta(row.ticker)
          return (
            <button
              key={row.job_id}
              onClick={() => onSelect(row.job_id)}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg glass-inner transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(134,143,151,0.35)' }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.07)' }}
            >
              {/* Logo */}
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
                color: '#479ffa', background: 'rgba(71,159,250,0.08)',
                border: '1px solid rgba(71,159,250,0.16)',
              }}>
                {meta.initials}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Linha superior */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[12px] font-bold" style={{ color: '#479ffa' }}>
                    {row.ticker}
                  </span>
                  <span className="font-mono text-[9px]" style={{ color: '#868f97' }}>
                    {meta.name}
                  </span>
                  <span className={`font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full border ml-1 ${REC_CHIP[row.recommendation]}`}>
                    {REC_LABEL[row.recommendation]}
                  </span>
                  <span className="font-mono text-[10px] ml-auto whitespace-nowrap" style={{ color: '#868f97' }}>
                    {formatDate(row.timestamp)}
                  </span>
                </div>
                {/* Linha inferior: barra de confiança */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-mono text-[8px]" style={{ color: '#999999', minWidth: 28 }}>
                    {Math.round(row.confidence * 100)}%
                  </span>
                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 1,
                      width: `${Math.round(row.confidence * 100)}%`,
                      background: REC_BAR_COLOR[row.recommendation],
                    }} />
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
