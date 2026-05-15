import { useEffect, useState } from 'react'
import type { AnalysisRow } from '../../../lib/types'
import { IdeaCard } from '../widgets/IdeaCard'
import { SkeletonCard } from '../widgets/SkeletonCard'
import { HistoryModal } from '../../HistoryModal'

interface Props { ticker: string }

export function CommunityPanel({ ticker }: Props) {
  const [rows, setRows]       = useState<AnalysisRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/analyses?ticker=${encodeURIComponent(ticker)}`)
      .then(r => r.json())
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {[1,2,3].map(i => <SkeletonCard key={i} height={220} />)}
    </div>
  }

  return (
    <>
      <div className="glass-accent" style={{ padding: '18px 22px', fontSize: 12, color: '#cccccc',
        lineHeight: 1.6, marginBottom: 16 }}>
        💡 <strong style={{ color: '#ffa16c' }}>Comunidade FinSwarm</strong> — análises multi-agente
        anteriores feitas neste ativo. Cada card representa uma execução completa dos 7 agentes.
      </div>

      {rows && rows.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: 'center', color: '#868f97' }}>
          Nenhuma análise feita ainda neste ticker. Rode a primeira clicando em
          <strong style={{ color: '#ffa16c' }}> Analisar com FinSwarm </strong>no rodapé.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {(rows || []).map(r => (
            <IdeaCard key={r.job_id} analysis={r} onClick={() => setSelected(r.job_id)} />
          ))}
        </div>
      )}

      <HistoryModal jobId={selected} onClose={() => setSelected(null)} />
    </>
  )
}
