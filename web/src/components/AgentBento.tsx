import type { AnalysisResult, AgentOutput, Recommendation } from '../lib/types'

interface Props { result: AnalysisResult }

// ── Shared primitives ─────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily:'monospace', fontSize:9, textTransform:'uppercase',
    letterSpacing:'0.09em', color:'#868f97', marginBottom:6 }}>{children}</div>
}

function Chip({ children, color, bg, border }: { children:React.ReactNode; color:string; bg:string; border:string }) {
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 7px',
    borderRadius:999, fontSize:8, fontWeight:600, fontFamily:'monospace',
    textTransform:'uppercase', letterSpacing:'0.05em', color, background:bg,
    border:`1px solid ${border}` }}>{children}</span>
}

function BarRow({ label, value, max, color, display }: { label:string; value:number; max:number; color:string; display:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontFamily:'monospace', fontSize:8, color:'#868f97', minWidth:52 }}>{label}</span>
      <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:2, width:`${Math.min((value/max)*100,100)}%`, background:color }} />
      </div>
      <span style={{ fontFamily:'monospace', fontSize:8, color, minWidth:32, textAlign:'right' }}>{display}</span>
    </div>
  )
}

function BentoCard({ children, colSpan=1, style={} }: { children:React.ReactNode; colSpan?:number; style?: React.CSSProperties }) {
  return (
    <div style={{ gridColumn:`span ${colSpan}`, background:'rgba(255,255,255,0.03)',
      border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px', ...style }}>
      {children}
    </div>
  )
}

// ── Technical ─────────────────────────────────────────────────────────────────

function TechnicalCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  if (output.status === 'failed') return (
    <BentoCard colSpan={2}><CardLabel>Análise Técnica</CardLabel>
      <p style={{ fontSize:9, color:'#e05454' }}>{output.summary}</p></BentoCard>
  )
  const rsi = typeof r.rsi === 'number' ? r.rsi : 58
  const macdPositive = (r.macd_hist ?? 0) >= 0
  const dash = 81.7
  const filled = (rsi / 100) * dash
  const rsiColor = rsi < 30 ? '#e05454' : rsi > 70 ? '#e9a84a' : '#479ffa'
  const price = r.current_price ?? 38.4
  const sup = r.support_level ?? 35.2
  const res = r.resistance_level ?? 41.8
  const pos = sup && res ? ((price - sup) / (res - sup)) * 100 : 50

  return (
    <BentoCard colSpan={2}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <CardLabel>Análise Técnica</CardLabel>
        {r.signal && (
          <Chip color={macdPositive?'#4ebe96':'#e05454'} bg={macdPositive?'rgba(78,190,150,0.1)':'rgba(224,84,84,0.1)'} border={macdPositive?'rgba(78,190,150,0.2)':'rgba(224,84,84,0.2)'}>
            {r.signal}
          </Chip>
        )}
        {r.bollinger_position && (
          <Chip color='#868f97' bg='rgba(134,143,151,0.08)' border='rgba(134,143,151,0.15)'>
            Bollinger: {r.bollinger_position}
          </Chip>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {/* RSI arc */}
        <div>
          <div style={{ fontFamily:'monospace', fontSize:8, color:'#868f97', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>RSI (14)</div>
          <div style={{ position:'relative', width:72, height:40, margin:'0 auto' }}>
            <svg viewBox="0 0 72 40" width={72} height={40}>
              <path d="M8,38 A28,28 0 0,1 64,38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} strokeLinecap="round"/>
              <path d="M8,38 A28,28 0 0,1 64,38" fill="none" stroke={rsiColor} strokeWidth={6} strokeLinecap="round"
                strokeDasharray={dash} strokeDashoffset={dash - filled}/>
            </svg>
            <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
              fontSize:13, fontWeight:700, fontFamily:'monospace', color:rsiColor }}>{rsi}</div>
          </div>
          <div style={{ textAlign:'center', fontSize:8, color:'#868f97', marginTop:2 }}>{r.rsi_interpretation ?? '—'}</div>
        </div>
        {/* MACD bars */}
        <div>
          <div style={{ fontFamily:'monospace', fontSize:8, color:'#868f97', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>MACD Histograma</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:32 }}>
            {[0.3,0.4,0.35,0.5,0.6,0.55,0.7].map((h,i) => (
              <div key={i} style={{ flex:1, height:`${h*100}%`, borderRadius:'2px 2px 0 0',
                background: macdPositive ? `rgba(78,190,150,${h})` : `rgba(224,84,84,${h})` }} />
            ))}
          </div>
          <div style={{ fontSize:7, color: macdPositive?'#4ebe96':'#e05454', marginTop:3, fontFamily:'monospace' }}>
            {macdPositive ? 'cruzou sinal ↑' : 'abaixo do sinal ↓'}
          </div>
        </div>
        {/* Suporte / Resistência */}
        <div style={{ gridColumn:'span 2' }}>
          <div style={{ fontFamily:'monospace', fontSize:8, color:'#868f97', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Suporte / Resistência</div>
          <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:3, position:'relative' }}>
            <div style={{ position:'absolute', top:'50%',
              left:`${Math.min(Math.max(pos,2),98)}%`, width:8, height:8,
              borderRadius:'50%', background:'#ffa16c', border:'1px solid rgba(255,255,255,0.3)',
              transform:'translate(-50%,-50%)' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
            <span style={{ fontSize:8, color:'#868f97', fontFamily:'monospace' }}>R$ {r.support_level?.toFixed(2) ?? '—'}</span>
            <span style={{ fontSize:8, color:'#ffa16c', fontFamily:'monospace' }}>atual ●</span>
            <span style={{ fontSize:8, color:'#868f97', fontFamily:'monospace' }}>R$ {r.resistance_level?.toFixed(2) ?? '—'}</span>
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Sentiment ─────────────────────────────────────────────────────────────────

function SentimentCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const score: number = r.score ?? 0
  const pct = ((score + 1) / 2) * 100
  const color = score > 0.2 ? '#4ebe96' : score < -0.2 ? '#e05454' : '#e9a84a'
  const dash = 88
  const filled = (pct / 100) * dash

  return (
    <BentoCard>
      <CardLabel>Sentimento</CardLabel>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, margin:'6px 0' }}>
        <div style={{ position:'relative', width:80, height:44 }}>
          <svg viewBox="0 0 80 44" width={80} height={44}>
            <path d="M8,42 A32,32 0 0,1 72,42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} strokeLinecap="round"/>
            <path d="M8,42 A32,32 0 0,1 72,42" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
              strokeDasharray={dash} strokeDashoffset={dash - filled}/>
          </svg>
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
            fontSize:14, fontWeight:700, fontFamily:'monospace', color }}>{score.toFixed(1)}</div>
        </div>
        <Chip color={color} bg={`${color}1a`} border={`${color}38`}>{r.label ?? 'NEUTRO'}</Chip>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {(r.catalysts ?? []).slice(0,2).map((c:string,i:number) => (
          <div key={i} style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#4ebe96', flexShrink:0, marginTop:3 }} />
            <span style={{ fontSize:8, color:'#999999', lineHeight:1.4 }}>{c}</span>
          </div>
        ))}
        {(r.risks ?? []).slice(0,2).map((c:string,i:number) => (
          <div key={i} style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#e05454', flexShrink:0, marginTop:3 }} />
            <span style={{ fontSize:8, color:'#999999', lineHeight:1.4 }}>{c}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Fundamental ───────────────────────────────────────────────────────────────

function FundamentalCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const m = r._metrics ?? {}
  const healthColor = (h:string) => ({ EXCELENTE:'#4ebe96', BOA:'#4ebe96', REGULAR:'#e9a84a', RUIM:'#e05454' }[h] ?? '#868f97')
  const valColor    = (v:string) => ({ BARATO:'#4ebe96', JUSTO:'#e9a84a', CARO:'#e05454' }[v] ?? '#868f97')
  const debtColor   = (d:string) => ({ BAIXO:'#4ebe96', MODERADO:'#e9a84a', ALTO:'#e05454' }[d] ?? '#868f97')
  const hc = healthColor(r.health ?? '')
  const vc = valColor(r.valuation ?? '')
  const dc = debtColor(r.debt_risk ?? '')

  return (
    <BentoCard>
      <CardLabel>Fundamentalista</CardLabel>
      <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:8 }}>
        <Chip color={hc} bg={`${hc}1a`} border={`${hc}38`}>{r.health ?? '—'}</Chip>
        <Chip color={vc} bg={`${vc}1a`} border={`${vc}38`}>{r.valuation ?? '—'}</Chip>
        <Chip color={dc} bg={`${dc}1a`} border={`${dc}38`}>{r.debt_risk ?? '—'}</Chip>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {m.roe_pct    !== undefined && <BarRow label="ROE"     value={m.roe_pct}          max={30} color="#4ebe96" display={`${m.roe_pct}%`} />}
        {m.pl         !== undefined && <BarRow label="P/L"     value={m.pl}               max={30} color="#479ffa" display={`${m.pl}×`} />}
        {m.divida_bruta_pl !== undefined && <BarRow label="Dív/PL" value={m.divida_bruta_pl} max={3}  color="#e9a84a" display={`${m.divida_bruta_pl}`} />}
        {m.margem_ebit_pct !== undefined && <BarRow label="EBIT"   value={m.margem_ebit_pct} max={40} color="#4ebe96" display={`${m.margem_ebit_pct}%`} />}
      </div>
    </BentoCard>
  )
}

// ── Risk ──────────────────────────────────────────────────────────────────────

function RiskCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const score: number = r.risk_score ?? 50
  const riskColor = score < 35 ? '#4ebe96' : score < 65 ? '#e9a84a' : '#e05454'
  const circ = 138.2
  const filled = (score / 100) * circ

  return (
    <BentoCard colSpan={2}>
      <CardLabel>Risco</CardLabel>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr', gap:12, alignItems:'center' }}>
        {/* Dial */}
        <div style={{ position:'relative', width:64, height:64 }}>
          <svg viewBox="0 0 64 64" width={64} height={64}>
            <circle cx={32} cy={32} r={22} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7}/>
            <circle cx={32} cy={32} r={22} fill="none" stroke={riskColor} strokeWidth={7}
              strokeDasharray={circ} strokeDashoffset={circ - filled}
              strokeLinecap="round" transform="rotate(-90 32 32)"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:16, fontWeight:700, fontFamily:'monospace', color:riskColor, lineHeight:1 }}>{score}</span>
            <span style={{ fontSize:7, color:'#868f97', textTransform:'uppercase', letterSpacing:'0.06em' }}>risco</span>
          </div>
        </div>
        {/* Stop / Exposição */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:8, textTransform:'uppercase', letterSpacing:'0.07em', color:'#868f97' }}>Stop Loss</div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:'monospace', color:'#e05454' }}>−{r.stop_loss_pct?.toFixed(1) ?? '—'}%</div>
          </div>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:8, textTransform:'uppercase', letterSpacing:'0.07em', color:'#868f97' }}>Max Exposição</div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:'#cccccc' }}>{r.max_exposure_pct?.toFixed(0) ?? '—'}% carteira</div>
          </div>
        </div>
        {/* Tags de risco */}
        <div>
          <div style={{ fontFamily:'monospace', fontSize:8, textTransform:'uppercase', letterSpacing:'0.07em', color:'#868f97', marginBottom:5 }}>Principais riscos</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
            {(r.main_risks ?? []).slice(0,3).map((risk:string, i:number) => (
              <span key={i} style={{ fontSize:8, padding:'2px 7px', borderRadius:999,
                background:'rgba(233,168,74,0.08)', color:'#e9a84a',
                border:'1px solid rgba(233,168,74,0.15)', fontFamily:'monospace' }}>
                {risk}
              </span>
            ))}
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Bull ──────────────────────────────────────────────────────────────────────

function BullCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  return (
    <BentoCard style={{ borderColor:'rgba(78,190,150,0.14)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ width:24, height:24, borderRadius:6, background:'rgba(78,190,150,0.12)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>🐂</div>
        <span style={{ fontSize:11, fontWeight:600, color:'#4ebe96' }}>Tese de Alta</span>
        <Chip color="#4ebe96" bg="rgba(78,190,150,0.1)" border="rgba(78,190,150,0.22)">{r.conviction ?? '—'}</Chip>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {(r.arguments ?? []).slice(0,3).map((arg:string, i:number) => (
          <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
            <span style={{ color:'#4ebe96', fontSize:9, flexShrink:0, marginTop:1 }}>↑</span>
            <span style={{ fontSize:9, color:'#999999', lineHeight:1.5 }}>{arg}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Bear ──────────────────────────────────────────────────────────────────────

function BearCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  return (
    <BentoCard style={{ borderColor:'rgba(224,84,84,0.14)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ width:24, height:24, borderRadius:6, background:'rgba(224,84,84,0.12)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>🐻</div>
        <span style={{ fontSize:11, fontWeight:600, color:'#e05454' }}>Tese de Baixa</span>
        <Chip color="#e9a84a" bg="rgba(233,168,74,0.1)" border="rgba(233,168,74,0.2)">{r.conviction ?? '—'}</Chip>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {(r.arguments ?? []).slice(0,3).map((arg:string, i:number) => (
          <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
            <span style={{ color:'#e05454', fontSize:9, flexShrink:0, marginTop:1 }}>↓</span>
            <span style={{ fontSize:9, color:'#999999', lineHeight:1.5 }}>{arg}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Synthesis ─────────────────────────────────────────────────────────────────

function SynthesisCard({ output, confidence }: { output: AgentOutput; confidence: number }) {
  const r = output.raw as any
  const pct = Math.round(confidence * 100)
  const circ = 163.4
  const filled = (pct / 100) * circ

  return (
    <BentoCard colSpan={3} style={{ borderColor:'rgba(255,161,108,0.18)', background:'rgba(255,161,108,0.03)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:14, alignItems:'center' }}>
        {/* Anel */}
        <div style={{ position:'relative', width:72, height:72 }}>
          <svg viewBox="0 0 72 72" width={72} height={72}>
            <circle cx={36} cy={36} r={26} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7}/>
            <circle cx={36} cy={36} r={26} fill="none" stroke="#ffa16c" strokeWidth={7}
              strokeDasharray={circ} strokeDashoffset={circ - filled}
              strokeLinecap="round" transform="rotate(-90 36 36)"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:1 }}>
            <span style={{ fontSize:8, fontWeight:700, color:'#ffa16c', textTransform:'uppercase', letterSpacing:'0.04em' }}>
              {r.recommendation ?? '—'}
            </span>
            <span style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1 }}>{pct}%</span>
          </div>
        </div>
        {/* Texto */}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'#ffa16c', marginBottom:6 }}>Síntese Final</div>
          <div style={{ fontSize:10, color:'#999999', lineHeight:1.6 }}>{r.reasoning ?? output.summary}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>
            <Chip color="#ffa16c" bg="rgba(255,161,108,0.1)" border="rgba(255,161,108,0.22)">{r.recommendation ?? '—'}</Chip>
            <Chip color="#4ebe96" bg="rgba(78,190,150,0.1)" border="rgba(78,190,150,0.22)">confiança {pct}%</Chip>
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AgentBento({ result }: Props) {
  const a = result.agents
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:8 }}>
      <TechnicalCard    output={a.technical} />
      <SentimentCard    output={a.sentiment} />
      <FundamentalCard  output={a.fundamental} />
      <RiskCard         output={a.risk} />
      <BullCard         output={a.bull} />
      <BearCard         output={a.bear} />
      <SynthesisCard    output={a.synthesis} confidence={result.confidence} />
    </div>
  )
}
