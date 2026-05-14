import type { AnalysisResult, Recommendation } from '../lib/types'
import { PriceChart } from './PriceChart'

interface ReportHeroProps { result: AnalysisResult }

const CONF_BADGE: Record<Recommendation, string> = {
  COMPRAR: 'rgba(78,190,150,0.1)',
  MANTER:  'rgba(233,168,74,0.1)',
  VENDER:  'rgba(224,84,84,0.1)',
}
const CONF_BORDER: Record<Recommendation, string> = {
  COMPRAR: 'rgba(78,190,150,0.22)',
  MANTER:  'rgba(233,168,74,0.2)',
  VENDER:  'rgba(224,84,84,0.2)',
}
const CONF_COLOR: Record<Recommendation, string> = {
  COMPRAR: '#4ebe96',
  MANTER:  '#e9a84a',
  VENDER:  '#e05454',
}

export function ReportHero({ result }: ReportHeroProps) {
  const confPct  = Math.round(result.confidence * 100)
  const riskWarn = result.risk_score >= 65 ? '#e05454' : '#e9a84a'
  const rec      = result.recommendation

  return (
    <section className="glass rounded-xl overflow-hidden animate-fade-up">
      {/* Top: rec + badges */}
      <div style={{ padding: '14px 16px 12px', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div data-testid="recommendation" style={{
            fontSize: 30, fontWeight: 700, lineHeight: 1, color: '#ffa16c',
          }}>
            {rec}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97',
            marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em',
            display: 'flex', gap: 4, alignItems: 'center' }}>
            <span>{result.ticker}</span>
            <span>·</span>
            <span>{new Date(result.timestamp).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 9, padding: '3px 9px', borderRadius: 999,
            background: CONF_BADGE[rec], border: `1px solid ${CONF_BORDER[rec]}`,
            color: CONF_COLOR[rec], fontWeight: 600,
          }}>
            {confPct}% confiança
          </span>
          <span style={{
            fontFamily: 'monospace', fontSize: 9, padding: '3px 9px', borderRadius: 999,
            background: 'rgba(233,168,74,0.1)', border: '1px solid rgba(233,168,74,0.2)',
            color: riskWarn, fontWeight: 600,
          }}>
            risco {result.risk_score}
          </span>
        </div>
      </div>

      {/* Gráfico interativo */}
      <PriceChart ticker={result.ticker} height={160} />

      {/* Métricas inline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, padding: '0 12px 12px' }}>
        {[
          { label: 'Confiança',  display: `${confPct}%`,                        color: CONF_COLOR[rec] },
          { label: 'Stop Loss',  display: `−${result.stop_loss_pct.toFixed(1)}%`, color: '#e05454' },
          { label: 'Risco',      display: `${result.risk_score}`,               color: riskWarn },
        ].map(m => (
          <div key={m.label} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>
              {m.display}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#868f97',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
