import type { AnalysisResult, Recommendation } from '../lib/types'

interface ReportHeroProps {
  result: AnalysisResult
}

const REC_COLOR: Record<Recommendation, string> = {
  COMPRAR: 'text-polar-white',
  MANTER:  'text-silver-dust',
  VENDER:  'text-data-blue',
}

const REC_ACCENT: Record<Recommendation, string> = {
  COMPRAR: 'bg-data-blue',
  MANTER:  'bg-light-gray',
  VENDER:  'bg-data-blue',
}

const REC_BADGE: Record<Recommendation, string> = {
  COMPRAR: 'bg-data-blue/12 text-data-blue border border-data-blue/25',
  MANTER:  'bg-light-gray/15 text-silver-dust border border-light-gray/25',
  VENDER:  'bg-data-blue/12 text-data-blue border border-data-blue/25',
}

function riskColor(score: number): string {
  if (score < 35) return '#22c55e'
  if (score < 65) return '#eab308'
  return '#ef4444'
}

export function ReportHero({ result }: ReportHeroProps) {
  const confidencePct = Math.round(result.confidence * 100)
  const risk = result.risk_score

  return (
    <section className="flex flex-col gap-6 animate-fade-up">
      {/* Recommendation header */}
      <div className="glass rounded-lg p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 font-mono text-[11px] tracking-wide font-medium ${REC_BADGE[result.recommendation]}`}>
                RECOMENDAÇÃO
              </span>
            </div>
            <h1
              data-recommendation={result.recommendation}
              className={`text-[56px] font-semibold leading-none tracking-[-0.036px] ${REC_COLOR[result.recommendation]}`}
            >
              {result.recommendation}
            </h1>
          </div>
          <div className={`h-12 w-1 rounded-full shrink-0 mt-1 ${REC_ACCENT[result.recommendation]}`} />
        </div>

        <p className="font-mono text-[12px] text-dim-gray flex gap-3">
          <span>{result.ticker}</span>
          <span>·</span>
          <span>{new Date(result.timestamp).toLocaleString('pt-BR')}</span>
          <span>·</span>
          <span>{result.elapsed_seconds.toFixed(0)}s</span>
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Confiança */}
        <div className="glass rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-dim-gray">Confiança</dt>
            <dd className="font-semibold text-xl text-polar-white tabular-nums">{confidencePct}%</dd>
          </div>
          <div className="h-1.5 bg-dark-frost rounded-full overflow-hidden">
            <div
              className="h-full bg-data-blue rounded-full animate-bar-fill"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-dim-gray">
            {confidencePct >= 75 ? 'alta convicção' : confidencePct >= 50 ? 'convicção moderada' : 'baixa convicção'}
          </p>
        </div>

        {/* Risco */}
        <div className="glass rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-dim-gray">Risco</dt>
            <dd className="font-semibold text-xl tabular-nums" style={{ color: riskColor(risk) }}>{risk}/100</dd>
          </div>
          {/* Gradient track + fill */}
          <div
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{ background: 'linear-gradient(to right, #22c55e 0%, #eab308 50%, #ef4444 100%)' }}
          >
            {/* Dark overlay to the right of the current value */}
            <div
              className="absolute inset-y-0 right-0 bg-dark-frost"
              style={{ left: `${risk}%` }}
            />
            {/* Marker dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2.5 w-0.5 bg-polar-white rounded-full"
              style={{ left: `calc(${risk}% - 1px)` }}
            />
          </div>
          <p className="font-mono text-[10px] text-dim-gray">
            {risk < 35 ? 'risco baixo' : risk < 65 ? 'risco moderado' : 'risco elevado'}
          </p>
        </div>

        {/* Stop loss */}
        <div className="glass rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-dim-gray">Stop Loss</dt>
            <dd className="font-semibold text-xl text-polar-white tabular-nums">{result.stop_loss_pct.toFixed(1)}%</dd>
          </div>
          {/* Visual: stacked bar showing stop-loss range */}
          <div className="h-1.5 bg-dark-frost rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-bar-fill"
              style={{
                width: `${Math.min(result.stop_loss_pct * 5, 100)}%`,
                background: 'linear-gradient(to right, #6798ff, #a0bcff)',
              }}
            />
          </div>
          <p className="font-mono text-[10px] text-dim-gray">
            {result.stop_loss_pct < 5 ? 'stop conservador' : result.stop_loss_pct < 10 ? 'stop padrão' : 'stop agressivo'}
          </p>
        </div>
      </div>
    </section>
  )
}
