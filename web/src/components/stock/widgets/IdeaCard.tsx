import type { AnalysisRow } from '../../../lib/types'

interface Props { analysis: AnalysisRow; onClick: () => void }

const REC_STYLE: Record<string, { bg: string; border: string; fg: string; label: string }> = {
  BUY:  { bg: 'rgba(78,190,150,0.12)', border: 'rgba(78,190,150,0.3)', fg: '#4ebe96', label: 'COMPRAR' },
  HOLD: { bg: 'rgba(134,143,151,0.12)', border: 'rgba(134,143,151,0.3)', fg: '#868f97', label: 'NEUTRO' },
  SELL: { bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.3)', fg: '#ff6b6b', label: 'VENDER' },
}

export function IdeaCard({ analysis, onClick }: Props) {
  const rec = REC_STYLE[analysis.recommendation] || REC_STYLE.HOLD
  const date = new Date(analysis.timestamp).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  return (
    <div className="glass" onClick={onClick} style={{ padding: 20, cursor: 'pointer', transition: 'all 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #479ffa, #2a7fdf)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'white',
        }}>7A</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#e6e6e6', fontWeight: 500 }}>Análise FinSwarm</div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97' }}>{date}</div>
        </div>
        <span style={{
          padding: '3px 9px', borderRadius: 999, fontFamily: 'monospace', fontSize: 9,
          fontWeight: 700, background: rec.bg, color: rec.fg,
          border: `1px solid ${rec.border}`,
        }}>{rec.label}</span>
      </div>
      <div style={{
        height: 90, background: 'rgba(255,255,255,0.03)', borderRadius: 8,
        marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', fontSize: 9, color: '#868f97',
      }}>
        confiança {Math.round(analysis.confidence * 100)}%
      </div>
      <div style={{ display: 'flex', gap: 14, fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>
        <span>📊 {Math.round(analysis.confidence * 100)}%</span>
        <span>{analysis.ticker}</span>
      </div>
    </div>
  )
}
