import { useEffect, useState } from 'react'
import type { AnalysisResult } from '../lib/types'
import { fetchAnalysis } from '../lib/api'
import { ReportHero } from './ReportHero'
import { AgentBento } from './AgentBento'

interface HistoryModalProps {
  jobId: string | null
  onClose: () => void
}

export function HistoryModal({ jobId, onClose }: HistoryModalProps) {
  const [result, setResult]   = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) { setResult(null); return }
    setLoading(true)
    setError(null)
    fetchAnalysis(jobId)
      .then(r  => { setResult(r); setLoading(false) })
      .catch(() => { setError('Erro ao carregar análise.'); setLoading(false) })
  }, [jobId])

  if (!jobId) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#131313',
      zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Sticky header */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(19,19,19,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
            color: '#868f97', background: 'none', border: 'none', padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e6e6e6' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#868f97' }}
        >
          ← Voltar
        </button>
        {result && (
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#479ffa', marginLeft: 4 }}>
            {result.ticker}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 32px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#868f97' }}
              className="animate-pulse">
              Carregando análise...
            </span>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#e05454' }}>{error}</span>
          </div>
        )}

        {result && !loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: 20,
            maxWidth: 1400,
            margin: '0 auto',
            alignItems: 'start',
          }}>
            {/* Coluna esquerda: ReportHero */}
            <div style={{ position: 'sticky', top: 0 }}>
              <ReportHero result={result} />
            </div>
            {/* Coluna direita: AgentBento */}
            <div>
              <AgentBento result={result} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
