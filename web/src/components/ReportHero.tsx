import type { AnalysisResult, Recommendation } from '../lib/types'

interface ReportHeroProps { result: AnalysisResult }

const REC_COLOR: Record<Recommendation, string> = {
  COMPRAR: '#4ebe96', MANTER: '#e9a84a', VENDER: '#e05454',
}
const REC_BG: Record<Recommendation, string> = {
  COMPRAR: 'rgba(78,190,150,0.1)', MANTER: 'rgba(233,168,74,0.1)', VENDER: 'rgba(224,84,84,0.1)',
}
const REC_BORDER: Record<Recommendation, string> = {
  COMPRAR: 'rgba(78,190,150,0.25)', MANTER: 'rgba(233,168,74,0.22)', VENDER: 'rgba(224,84,84,0.22)',
}

export function ReportHero({ result }: ReportHeroProps) {
  const confPct  = Math.round(result.confidence * 100)
  const riskColor = result.risk_score >= 65 ? '#e05454' : result.risk_score >= 40 ? '#e9a84a' : '#4ebe96'
  const rec      = result.recommendation
  const color    = REC_COLOR[rec]
  const date     = new Date(result.timestamp).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <section className="glass-strong rounded-xl overflow-hidden animate-fade-up">
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Linha topo: rec + ticker + data */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div data-testid="recommendation" style={{
              fontSize: 48, fontWeight: 900, lineHeight: 1,
              color, letterSpacing: '-0.03em',
            }}>
              {rec}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#e6e6e6', letterSpacing: '-0.01em' }}>
                {result.ticker.replace(/\.SA$/i, '')}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#868f97' }}>{date}</span>
            </div>
          </div>

          {/* Métricas em linha */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Confiança',  value: `${confPct}%`,                           color,            bg: REC_BG[rec],              border: REC_BORDER[rec] },
              { label: 'Stop Loss',  value: `−${result.stop_loss_pct.toFixed(1)}%`,  color: '#e05454', bg: 'rgba(224,84,84,0.08)',   border: 'rgba(224,84,84,0.2)' },
              { label: 'Risco',      value: `${result.risk_score}/100`,              color: riskColor, bg: 'rgba(233,168,74,0.08)',  border: 'rgba(233,168,74,0.18)' },
            ].map(m => (
              <div key={m.label} style={{
                background: m.bg, border: `1px solid ${m.border}`,
                borderRadius: 10, padding: '12px 20px', textAlign: 'center', minWidth: 100,
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: m.color, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {m.value}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97',
                  textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 5 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
      </div>
    </section>
  )
}
