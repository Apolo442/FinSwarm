import type { AnalysisResult, Recommendation } from '../lib/types'

interface ReportHeroProps {
  result: AnalysisResult
}

const RECOMMENDATION_CLASSES: Record<Recommendation, string> = {
  COMPRAR: 'text-pure-white',
  MANTER: 'text-porcelain-text',
  VENDER: 'bg-clip-text text-transparent bg-[var(--gradient-golden)]',
}

export function ReportHero({ result }: ReportHeroProps) {
  const formatted = {
    confidence: `${Math.round(result.confidence * 100)}%`,
    risk: `${result.risk_score}/100`,
    stopLoss: `${result.stop_loss_pct.toFixed(1)}%`,
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1
          data-recommendation={result.recommendation}
          className={`font-ivy text-6xl leading-none ${RECOMMENDATION_CLASSES[result.recommendation]}`}
        >
          {result.recommendation}
        </h1>
        <p className="text-xs text-ash-text">
          <span>{result.ticker}</span> · <span>{new Date(result.timestamp).toLocaleString('pt-BR')}</span>
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-6 border-t border-silver-text/20 pt-6">
        <Stat label="Confiança" value={formatted.confidence} />
        <Stat label="Risco" value={formatted.risk} />
        <Stat label="Stop loss" value={formatted.stopLoss} />
      </dl>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wider text-stone-text">{label}</dt>
      <dd className="text-2xl text-pure-white tabular-nums">{value}</dd>
    </div>
  )
}
