import type { AnalysisResult, AgentOutput } from '../lib/types'
import { PriceChart } from './PriceChart'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props { result: AnalysisResult }

// ── Shared primitives ──────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, textTransform: 'uppercase',
      letterSpacing: '0.09em', color: '#a0a8b4', marginBottom: 10, fontWeight: 600 }}>
      {children}
    </div>
  )
}

function Chip({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 11px',
      borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
      textTransform: 'uppercase', letterSpacing: '0.05em', color, background: bg,
      border: `1px solid ${border}` }}>
      {children}
    </span>
  )
}

function BarRow({ label, value, max, color, display }: { label: string; value: number; max: number; color: string; display: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#a0a8b4', minWidth: 60 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${Math.min((value / max) * 100, 100)}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: 13, color, minWidth: 40, textAlign: 'right', fontWeight: 700 }}>{display}</span>
    </div>
  )
}

function BentoCard({ children, colSpan = 1, style = {} }: { children: React.ReactNode; colSpan?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      gridColumn: `span ${colSpan}`,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.13)',
      borderRadius: 12, padding: '16px 18px', ...style,
    }}>
      {children}
    </div>
  )
}

// ── Technical ──────────────────────────────────────────────────────────────────

const DIV = <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '12px 0' }} />

function TechnicalCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  if (output.status === 'failed') return (
    <BentoCard colSpan={2}>
      <CardLabel>Análise Técnica</CardLabel>
      <p style={{ fontSize: 12, color: '#e05454' }}>{output.summary}</p>
    </BentoCard>
  )

  const rsi = typeof r.rsi === 'number' ? r.rsi : 58
  const macdPositive = (r.macd_hist ?? 0) >= 0
  const rsiColor = rsi < 30 ? '#e05454' : rsi > 70 ? '#e9a84a' : '#479ffa'
  const rsiZone = rsi < 30 ? 'Sobrevendido' : rsi > 70 ? 'Sobrecomprado' : 'Zona neutra'
  const price = r.current_price ?? 0
  const sup   = r.support_level   ?? 0
  const res   = r.resistance_level ?? 0
  const pos   = sup && res && res > sup ? Math.min(Math.max(((price - sup) / (res - sup)) * 100, 2), 98) : 50
  const signalColor = macdPositive ? '#4ebe96' : '#e05454'

  return (
    <BentoCard colSpan={2} style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <CardLabel>Análise Técnica</CardLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {r.signal && (
            <Chip color={signalColor} bg={`${signalColor}1a`} border={`${signalColor}33`}>
              {r.signal}
            </Chip>
          )}
          {r.bollinger_position && (
            <Chip color='#a0a8b4' bg='rgba(160,168,180,0.08)' border='rgba(160,168,180,0.18)'>
              BB: {r.bollinger_position}
            </Chip>
          )}
        </div>
      </div>

      {DIV}

      {/* RSI */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.09em', color: '#a0a8b4', fontWeight: 600 }}>RSI (14)</span>
          <span style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace',
            color: rsiColor, lineHeight: 1 }}>{rsi}</span>
          <span style={{ fontSize: 12, color: rsiColor, fontWeight: 600 }}>{rsiZone}</span>
        </div>
        {/* Barra RSI com zonas */}
        <div style={{ position: 'relative', height: 14, display: 'flex', alignItems: 'center' }}>
          {/* barra com overflow:hidden separado do ponteiro */}
          <div style={{ position: 'absolute', inset: '3px 0', borderRadius: 4, overflow: 'hidden',
            background: 'linear-gradient(to right, rgba(224,84,84,0.25) 0% 30%, rgba(71,159,250,0.15) 30% 70%, rgba(233,168,74,0.25) 70% 100%)' }}>
            <div style={{ position: 'absolute', left: '30%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ position: 'absolute', left: '70%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.15)' }} />
          </div>
          {/* ponteiro fora do overflow:hidden */}
          <div style={{
            position: 'absolute', top: '50%', left: `${rsi}%`,
            width: 14, height: 14, borderRadius: '50%',
            background: 'linear-gradient(145deg, #d4dce8 0%, #8e97a3 100%)',
            border: '1.5px solid rgba(255,255,255,0.75)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            transform: 'translate(-50%, -50%)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#e05454' }}>0 — Sobrevendido</span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>30 ──── 70</span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#e9a84a' }}>Sobrecomprado — 100</span>
        </div>
        {r.rsi_interpretation && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#c0c8d0', lineHeight: 1.45 }}>
            {r.rsi_interpretation}
          </div>
        )}
      </div>

      {DIV}

      {/* MACD */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.09em', color: '#a0a8b4', fontWeight: 600 }}>MACD (12, 26, 9)</span>
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: signalColor,
            background: `${signalColor}18`, padding: '2px 10px', borderRadius: 999, border: `1px solid ${signalColor}30` }}>
            {macdPositive ? '↑ Histograma positivo' : '↓ Histograma negativo'}
          </span>
        </div>

        {/* Três valores numéricos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {([
            { label: 'Linha MACD',  val: r.macd_line,        c: signalColor },
            { label: 'Linha Sinal', val: r.macd_signal_line,  c: '#a0a8b4'  },
            { label: 'Histograma',  val: r.macd_hist,         c: signalColor, prefix: true },
          ] as { label: string; val: number | undefined; c: string; prefix?: boolean }[]).map(({ label, val, c, prefix }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: '#868f97', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: c }}>
                {val != null ? `${prefix && val > 0 ? '+' : ''}${val.toFixed(4)}` : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Barra direcional zero-centrada */}
        <div style={{ position: 'relative', height: 22, borderRadius: 6,
          background: 'rgba(255,255,255,0.05)', marginBottom: 5, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0,
            width: 1, height: '100%', background: 'rgba(255,255,255,0.2)' }} />
          {macdPositive
            ? <div style={{ position: 'absolute', top: 3, bottom: 3, left: '50%',
                width: '32%', borderRadius: '0 4px 4px 0',
                background: 'rgba(78,190,150,0.65)' }} />
            : <div style={{ position: 'absolute', top: 3, bottom: 3, right: '50%',
                width: '32%', borderRadius: '4px 0 0 4px',
                background: 'rgba(224,84,84,0.65)' }} />
          }
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#e05454' }}>Baixista</span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>0</span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4ebe96' }}>Altista</span>
        </div>

        {r.macd_interpretation && (
          <div style={{ fontSize: 12, color: '#c0c8d0', lineHeight: 1.5 }}>
            {r.macd_interpretation}
          </div>
        )}
      </div>

      {DIV}

      {/* Suporte / Resistência */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.09em', color: '#a0a8b4', fontWeight: 600 }}>Suporte / Resistência</span>
          {price > 0 && (
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#ffa16c', fontWeight: 700 }}>
              atual R$ {price.toFixed(2)}
            </span>
          )}
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, position: 'relative' }}>
          {/* zona entre suporte e resistência */}
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%',
            background: 'linear-gradient(to right, rgba(78,190,150,0.12), rgba(233,168,74,0.12))', borderRadius: 4 }} />
          <div style={{
            position: 'absolute', top: '50%', left: `${pos}%`,
            width: 14, height: 14, borderRadius: '50%',
            background: 'linear-gradient(145deg, #d4dce8 0%, #8e97a3 100%)',
            border: '1.5px solid rgba(255,255,255,0.75)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            transform: 'translate(-50%, -50%)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4ebe96', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Suporte</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#e6e6e6' }}>
              {sup ? `R$ ${sup.toFixed(2)}` : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#e9a84a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Resistência</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#e6e6e6' }}>
              {res ? `R$ ${res.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Sentiment ──────────────────────────────────────────────────────────────────

function SentimentCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const score: number = r.score ?? 0
  const pct = ((score + 1) / 2) * 100
  const color = score > 0.2 ? '#4ebe96' : score < -0.2 ? '#e05454' : '#e9a84a'

  return (
    <BentoCard style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center' }}>
      <CardLabel>Sentimento</CardLabel>
      {/* Score + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 48, fontWeight: 800, fontFamily: 'monospace',
          color, lineHeight: 1, letterSpacing: '-0.03em' }}>
          {score.toFixed(1)}
        </span>
        <Chip color={color} bg={`${color}1a`} border={`${color}38`}>{r.label ?? 'NEUTRO'}</Chip>
      </div>
      {/* Barra de espectro */}
      <div style={{ width: '100%', marginBottom: 6 }}>
        <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 1,
            height: '100%', background: 'rgba(255,255,255,0.25)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}>Negativo</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}>Positivo</span>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Fundamental ───────────────────────────────────────────────────────────────

function FundamentalCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const m = r._metrics ?? {}
  const healthColor = (h: string) => ({ EXCELENTE: '#4ebe96', BOA: '#4ebe96', REGULAR: '#e9a84a', RUIM: '#e05454' }[h] ?? '#a0a8b4')
  const valColor    = (v: string) => ({ BARATO: '#4ebe96', JUSTO: '#e9a84a', CARO: '#e05454' }[v] ?? '#a0a8b4')
  const debtColor   = (d: string) => ({ BAIXO: '#4ebe96', MODERADO: '#e9a84a', ALTO: '#e05454' }[d] ?? '#a0a8b4')
  const hc = healthColor(r.health ?? '')
  const vc = valColor(r.valuation ?? '')
  const dc = debtColor(r.debt_risk ?? '')

  return (
    <BentoCard>
      <CardLabel>Fundamentalista</CardLabel>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        <Chip color={hc} bg={`${hc}1a`} border={`${hc}38`}>{r.health ?? '—'}</Chip>
        <Chip color={vc} bg={`${vc}1a`} border={`${vc}38`}>{r.valuation ?? '—'}</Chip>
        <Chip color={dc} bg={`${dc}1a`} border={`${dc}38`}>{r.debt_risk ?? '—'}</Chip>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {m.roe_pct         > 0 && <BarRow label="ROE"     value={m.roe_pct}         max={30} color="#4ebe96" display={`${m.roe_pct}%`} />}
        {m.pl              > 0 && <BarRow label="P/L"     value={m.pl}              max={30} color="#479ffa" display={`${m.pl}×`} />}
        {m.pvp             > 0 && <BarRow label="P/VP"    value={m.pvp}             max={5}  color="#479ffa" display={`${m.pvp}×`} />}
        {m.divida_bruta_pl > 0 && <BarRow label="Dív/PL" value={m.divida_bruta_pl} max={3}  color="#e9a84a" display={`${m.divida_bruta_pl}`} />}
        {m.margem_ebit_pct > 0 && <BarRow label="Margem" value={m.margem_ebit_pct} max={40} color="#4ebe96" display={`${m.margem_ebit_pct}%`} />}
        {m.roe_pct === 0 && m.pl === 0 && (
          <div style={{ paddingTop: 4 }}>
            {r.roe_interpretation && (
              <p style={{ fontSize: 13, color: '#c0c8d0', lineHeight: 1.55, margin: 0 }}>
                {r.roe_interpretation}
              </p>
            )}
            {r.summary && (
              <p style={{ fontSize: 12, color: '#868f97', lineHeight: 1.5, margin: '8px 0 0' }}>
                {r.summary}
              </p>
            )}
            {!r.roe_interpretation && !r.summary && (
              <p style={{ fontSize: 12, color: '#868f97', lineHeight: 1.6, margin: 0 }}>
                Métricas fundamentalistas não disponíveis para este papel.
                Os dados podem estar indisponíveis na fonte ou o ativo não reporta demonstrações completas no período analisado.
              </p>
            )}
          </div>
        )}
      </div>
    </BentoCard>
  )
}

// ── Risk ───────────────────────────────────────────────────────────────────────

function RiskCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const score: number = r.risk_score ?? 50
  const riskColor = score < 35 ? '#4ebe96' : score < 65 ? '#e9a84a' : '#e05454'

  return (
    <BentoCard colSpan={2}>
      <CardLabel>Risco</CardLabel>
      {/* Três stats em linha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: '#a0a8b4', marginBottom: 4 }}>Score de Risco</div>
          <div style={{ fontSize: 34, fontWeight: 800, fontFamily: 'monospace',
            color: riskColor, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 11, color: '#a0a8b4', marginTop: 3 }}>/100</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: '#a0a8b4', marginBottom: 4 }}>Stop Loss</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace',
            color: '#e05454', lineHeight: 1 }}>−{r.stop_loss_pct?.toFixed(1) ?? '—'}%</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: '#a0a8b4', marginBottom: 4 }}>Max Exposição</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace',
            color: '#e6e6e6', lineHeight: 1 }}>{r.max_exposure_pct?.toFixed(0) ?? '—'}%</div>
          <div style={{ fontSize: 11, color: '#a0a8b4', marginTop: 3 }}>da carteira</div>
        </div>
      </div>
      {/* Barra de risco */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${score}%`, background: riskColor, borderRadius: 3 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4ebe96' }}>Baixo</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e9a84a' }}>Moderado</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e05454' }}>Alto</span>
        </div>
      </div>
      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {(r.main_risks ?? []).slice(0, 4).map((risk: string, i: number) => (
          <span key={i} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 999,
            background: 'rgba(233,168,74,0.1)', color: '#e9a84a',
            border: '1px solid rgba(233,168,74,0.22)', fontFamily: 'monospace' }}>
            {risk}
          </span>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Bull ───────────────────────────────────────────────────────────────────────

function BullCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  return (
    <BentoCard style={{ borderColor: 'rgba(78,190,150,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(78,190,150,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={15} color="#4ebe96" strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4ebe96' }}>Tese de Alta</span>
        <Chip color="#4ebe96" bg="rgba(78,190,150,0.12)" border="rgba(78,190,150,0.28)">{r.conviction ?? '—'}</Chip>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {(r.arguments ?? []).slice(0, 3).map((arg: string, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <span style={{ color: '#4ebe96', fontSize: 13, flexShrink: 0, marginTop: 2 }}>↑</span>
            <span style={{ fontSize: 13, color: '#c0c8d0', lineHeight: 1.5 }}>{arg}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Bear ───────────────────────────────────────────────────────────────────────

function BearCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  return (
    <BentoCard style={{ borderColor: 'rgba(224,84,84,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(224,84,84,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingDown size={15} color="#e05454" strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e05454' }}>Tese de Baixa</span>
        <Chip color="#e9a84a" bg="rgba(233,168,74,0.12)" border="rgba(233,168,74,0.25)">{r.conviction ?? '—'}</Chip>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {(r.arguments ?? []).slice(0, 3).map((arg: string, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <span style={{ color: '#e05454', fontSize: 13, flexShrink: 0, marginTop: 2 }}>↓</span>
            <span style={{ fontSize: 13, color: '#c0c8d0', lineHeight: 1.5 }}>{arg}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Synthesis ──────────────────────────────────────────────────────────────────

function SynthesisCard({ output, confidence }: { output: AgentOutput; confidence: number }) {
  const r = output.raw as any
  const pct = Math.round(confidence * 100)

  return (
    <BentoCard colSpan={3} style={{ borderColor: 'rgba(255,161,108,0.22)', background: 'rgba(255,161,108,0.04)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg viewBox="0 0 120 120" width={120} height={120}>
            <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8}/>
            <circle cx={60} cy={60} r={50} fill="none" stroke="#ffa16c" strokeWidth={8}
              strokeDasharray={314.2} strokeDashoffset={314.2 - (pct / 100) * 314.2}
              strokeLinecap="round" transform="rotate(-90 60 60)"/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffa16c', textTransform: 'uppercase',
              letterSpacing: '0.06em', fontFamily: 'monospace' }}>
              {r.recommendation ?? '—'}
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1, fontFamily: 'monospace' }}>{pct}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#ffa16c', marginBottom: 8 }}>Síntese Final</div>
          <div style={{ fontSize: 14, color: '#c0c8d0', lineHeight: 1.65 }}>{r.reasoning ?? output.summary}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <Chip color="#ffa16c" bg="rgba(255,161,108,0.12)" border="rgba(255,161,108,0.28)">{r.recommendation ?? '—'}</Chip>
            <Chip color="#4ebe96" bg="rgba(78,190,150,0.12)" border="rgba(78,190,150,0.28)">confiança {pct}%</Chip>
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

function ChartCard({ ticker }: { ticker: string }) {
  return (
    <BentoCard style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 6px' }}>
        <CardLabel>Gráfico de Preço</CardLabel>
      </div>
      <PriceChart ticker={ticker} height={170} />
    </BentoCard>
  )
}

export function AgentBento({ result }: Props) {
  const a = result.agents
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4 }}>
      {/* Linha 1: Técnico(2) | Gráfico(1) */}
      <TechnicalCard   output={a.technical} />
      <ChartCard       ticker={result.ticker} />
      {/* Linha 2: Fundamentalista(1) | Risco(2) */}
      <FundamentalCard output={a.fundamental} />
      <RiskCard        output={a.risk} />
      {/* Linha 3: Alta(1) | Baixa(1) | Sentimento(1) */}
      <BullCard        output={a.bull} />
      <BearCard        output={a.bear} />
      <SentimentCard   output={a.sentiment} />
      {/* Linha 4: Síntese(3) */}
      <SynthesisCard   output={a.synthesis} confidence={result.confidence} />
    </div>
  )
}
