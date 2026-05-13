import { useEffect, useState } from 'react'
import type { AnalysisRow, Recommendation } from '../lib/types'
import { fetchAnalyses } from '../lib/api'

interface HistoryDrawerProps {
  onSelect: (jobId: string) => void
}

type Filter = 'ALL' | Recommendation

const REC_CHIP: Record<Recommendation, string> = {
  COMPRAR: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  MANTER:  'border-yellow-500/25 text-yellow-400 bg-yellow-500/8',
  VENDER:  'border-red-500/25 text-red-400 bg-red-500/8',
}

const REC_LABEL: Record<Recommendation, string> = {
  COMPRAR: 'comprar',
  MANTER:  'manter',
  VENDER:  'vender',
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-light-gray/15">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim-gray">
          Histórico
        </span>
        <span className="font-mono text-[11px] text-data-blue tabular-nums">{filtered.length}</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <input
          type="text"
          placeholder="Buscar ticker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-dark-frost border border-light-gray/15 rounded-md px-3 py-1.5 font-mono text-[12px] text-polar-white placeholder:text-dim-gray focus:outline-none focus:border-data-blue/50"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3 pt-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md border transition-colors ${
              filter === f.value
                ? 'border-data-blue/50 text-data-blue bg-data-blue/10'
                : 'border-light-gray/15 text-dim-gray hover:border-light-gray/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 min-h-0">
        {error && (
          <p className="font-mono text-[10px] text-error text-center mt-4">
            Erro ao carregar histórico
          </p>
        )}
        {!error && rows.length === 0 && (
          <p className="font-mono text-[10px] text-dim-gray text-center mt-8">
            Nenhuma análise ainda
          </p>
        )}
        {!error && rows.length > 0 && filtered.length === 0 && (
          <p className="font-mono text-[10px] text-dim-gray text-center mt-8">
            Nenhum resultado
          </p>
        )}
        {filtered.map(row => (
          <button
            key={row.job_id}
            onClick={() => onSelect(row.job_id)}
            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md border border-light-gray/10 hover:border-data-blue/30 hover:bg-data-blue/5 transition-colors"
          >
            <span className="font-mono text-[12px] font-bold text-data-blue min-w-[52px]">
              {row.ticker}
            </span>
            <span className={`font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full border ${REC_CHIP[row.recommendation]}`}>
              {REC_LABEL[row.recommendation]}
            </span>
            <span className="font-mono text-[10px] text-dim-gray ml-auto whitespace-nowrap">
              {formatDate(row.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
