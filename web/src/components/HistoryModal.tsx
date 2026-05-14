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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!jobId) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto px-6 py-10"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="font-mono text-[11px] text-dim-gray hover:text-polar-white transition-colors"
          >
            ✕ fechar
          </button>
        </div>

        {loading && (
          <div className="glass rounded-lg p-8 text-center">
            <span className="font-mono text-[11px] text-dim-gray animate-pulse">
              Carregando análise...
            </span>
          </div>
        )}

        {error && (
          <div className="glass rounded-lg p-8 text-center">
            <span className="font-mono text-[11px] text-error">{error}</span>
          </div>
        )}

        {result && !loading && (
          <>
            <ReportHero result={result} />
            <AgentBento result={result} />
          </>
        )}
      </div>
    </div>
  )
}
