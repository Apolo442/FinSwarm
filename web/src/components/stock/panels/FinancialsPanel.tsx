import { useState } from 'react'
import type { FinancialsResponse } from '../../../lib/stockApi'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: FinancialsResponse | null; loading: boolean }

// ── Formatters ───────────────────────────────────────────────────────────────
function fmtCurr(v: number | null | undefined): string {
  if (v == null) return '—'
  const abs = Math.abs(v), sign = v < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}R$ ${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9)  return `${sign}R$ ${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `${sign}R$ ${(abs / 1e6).toFixed(0)}M`
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}
function fmtPct(v: number | null | undefined, d = 1): string {
  return v != null ? `${(v * 100).toFixed(d)}%` : '—'
}
function fmtX(v: number | null | undefined): string {
  return v != null ? `${v.toFixed(1)}×` : '—'
}

// ── Shared UI atoms ──────────────────────────────────────────────────────────
function Bar({ pct, color = '#479ffa', h = 8 }: { pct: number; color?: string; h?: number }) {
  return (
    <div style={{ height: h, background: 'rgba(255,255,255,0.07)', borderRadius: 999 }}>
      <div style={{
        height: '100%', width: `${Math.min(Math.max(pct, 0), 100)}%`,
        background: color, borderRadius: 999, transition: 'width 0.5s ease',
      }} />
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="glass" style={{ padding: 24, ...style }}>{children}</div>
}

function SL({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      color: '#868f97', textTransform: 'uppercase', marginBottom: 14,
    }}>{label}</div>
  )
}

const DIV = () => <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 0' }} />

function MRow({ label, value, color = '#e6e6e6', sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: '#868f97' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color }}>{value}</span>
        {sub && <div style={{ fontSize: 10, color: '#868f97', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Visão Geral ──────────────────────────────────────────────────────────────
function ViewGeral({ data }: { data: FinancialsResponse }) {
  const cs = data.capital_structure
  const cap = cs.mkt_cap ?? 0
  const debt = cs.debt ?? 0
  const cash = cs.cash ?? 0
  const ev = cs.enterprise_value ?? 0
  const total = cap + debt

  const kpis = [
    { label: 'Market Cap',     value: fmtCurr(cap  || null) },
    { label: 'Enterprise Value', value: fmtCurr(ev   || null) },
    { label: 'Dívida Bruta',   value: fmtCurr(debt || null) },
    { label: 'Caixa',          value: fmtCurr(cash || null) },
    { label: 'Lucro Líq. 12M', value: fmtCurr(data.valuation.net_income) },
    { label: 'Receita 12M',    value: fmtCurr(data.valuation.revenue) },
  ]

  const capPct  = total > 0 ? (cap  / total) * 100 : 50
  const debtPct = total > 0 ? (debt / total) * 100 : 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {kpis.map(({ label, value }) => (
          <div key={label} className="glass" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#868f97', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 700, color: '#e6e6e6' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Capital structure */}
        <Card>
          <SL label="Estrutura de capital" />
          {total > 0 && (
            <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', marginBottom: 18 }}>
              <div style={{
                width: `${capPct}%`,
                background: 'linear-gradient(90deg, #479ffa, #5ab0ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {capPct > 14 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>Cap {capPct.toFixed(0)}%</span>}
              </div>
              <div style={{
                width: `${debtPct}%`,
                background: 'linear-gradient(90deg, #ffa16c, #ffb580)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {debtPct > 14 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>Dív {debtPct.toFixed(0)}%</span>}
              </div>
            </div>
          )}
          {[
            { label: 'Market Cap',       value: fmtCurr(cap  || null), color: '#479ffa' },
            { label: 'Dívida Bruta',     value: fmtCurr(debt || null), color: '#ffa16c' },
            { label: 'Caixa Disponível', value: fmtCurr(cash || null), color: '#4ebe96' },
            { label: 'Enterprise Value', value: fmtCurr(ev   || null), color: '#868f97' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#868f97', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                {label}
              </span>
              <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: '#e6e6e6' }}>{value}</span>
            </div>
          ))}
          <DIV />
          <MRow
            label="Dívida Líquida (Dívida − Caixa)"
            value={debt > 0 || cash > 0 ? fmtCurr(debt - cash) : '—'}
            color={debt > cash ? '#e05454' : '#4ebe96'}
          />
        </Card>

        {/* Profitability snapshot */}
        <Card>
          <SL label="Rentabilidade — últimos 12 meses" />
          {[
            { label: 'Retorno sobre Patrimônio (ROE)', v: data.profitability.roe,        color: '#4ebe96', max: 40 },
            { label: 'Retorno sobre Ativos (ROA)',     v: data.profitability.roa,        color: '#479ffa', max: 10 },
            { label: 'Margem Líquida',                v: data.profitability.net_margin,  color: '#ffa16c', max: 50 },
            { label: 'Margem EBIT (Operacional)',      v: data.profitability.ebit_margin, color: '#a78bfa', max: 50 },
          ].map(({ label, v, color, max }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#868f97' }}>{label}</span>
                <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color }}>{fmtPct(v)}</span>
              </div>
              <Bar pct={v != null ? Math.min((Math.abs(v * 100) / max) * 100, 100) : 0} color={color} h={7} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ── Demonstrações ─────────────────────────────────────────────────────────────
function ViewDemonstracoes({ data }: { data: FinancialsResponse }) {
  const growth = [...data.growth].sort((a, b) => a.year - b.year)
  const maxRev = Math.max(...growth.map(g => g.revenue ?? 0), 1)

  const lastDiv = data.dividends_history.length > 0
    ? data.dividends_history[data.dividends_history.length - 1]
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card>
        <SL label="Receita anual" />
        {growth.length === 0 ? (
          <div style={{ color: '#868f97', fontSize: 13 }}>Dados de receita não disponíveis para este papel</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {growth.map((g, i) => {
              const prev = i > 0 ? growth[i - 1].revenue : null
              const yoy = (prev && g.revenue && prev !== 0)
                ? ((g.revenue - prev) / Math.abs(prev)) * 100
                : null
              const pct = ((g.revenue ?? 0) / maxRev) * 100
              return (
                <div key={g.year}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <span style={{ fontSize: 13, color: '#cccccc', fontWeight: 700 }}>{g.year}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {yoy != null && (
                        <span style={{
                          fontSize: 12, fontFamily: 'monospace',
                          color: yoy >= 0 ? '#4ebe96' : '#e05454',
                          background: yoy >= 0 ? 'rgba(78,190,150,0.1)' : 'rgba(224,84,84,0.1)',
                          padding: '2px 8px', borderRadius: 999,
                        }}>
                          {yoy >= 0 ? '▲' : '▼'} {Math.abs(yoy).toFixed(1)}%
                        </span>
                      )}
                      <span style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 800, color: '#e6e6e6' }}>
                        {fmtCurr(g.revenue)}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 22, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'linear-gradient(90deg, #479ffa, rgba(71,159,250,0.35))',
                      borderRadius: 5, transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <SL label="Resultado atual (12M)" />
          <MRow label="Receita"        value={fmtCurr(data.valuation.revenue)}    color="#479ffa" />
          <MRow label="Lucro Líquido"  value={fmtCurr(data.valuation.net_income)} color="#4ebe96" />
          <DIV />
          {data.valuation.revenue && data.valuation.net_income ? (
            <MRow
              label="Margem Líquida"
              value={`${((data.valuation.net_income / data.valuation.revenue) * 100).toFixed(1)}%`}
              color="#ffa16c"
            />
          ) : <MRow label="Margem Líquida" value="—" />}
        </Card>

        <Card>
          <SL label="Por ação" />
          <MRow
            label="LPA 12M (EPS)"
            value={data.facts.eps_12m != null ? `R$ ${data.facts.eps_12m.toFixed(2)}` : '—'}
            color="#a78bfa"
          />
          <MRow
            label="DPA (último ano)"
            value={lastDiv?.dps != null ? `R$ ${lastDiv.dps.toFixed(2)}` : '—'}
            color="#f06292"
          />
          <MRow
            label="Dividend Yield"
            value={fmtPct(data.facts.div_yield)}
            color="#f06292"
          />
        </Card>
      </div>
    </div>
  )
}

// ── Estatísticas ──────────────────────────────────────────────────────────────
function ViewEstatisticas({ data }: { data: FinancialsResponse }) {
  const v = data.valuation
  const f = data.facts

  const multiples: { label: string; value: string; raw: number | null; note: string | null; color: string }[] = [
    {
      label: 'P/L — Preço / Lucro',
      value: fmtX(f.pl_12m), raw: f.pl_12m,
      note: f.pl_12m != null ? (f.pl_12m < 8 ? 'Barato para o histórico BR' : f.pl_12m < 15 ? 'Razoável' : 'Acima da média') : null,
      color: f.pl_12m != null ? (f.pl_12m < 8 ? '#4ebe96' : f.pl_12m < 15 ? '#ffa16c' : '#e05454') : '#868f97',
    },
    {
      label: 'P/VP — Preço / Valor Patrimonial',
      value: fmtX(v.pb), raw: v.pb,
      note: v.pb != null ? (v.pb < 1 ? 'Abaixo do patrimônio líquido' : v.pb < 2 ? 'Razoável' : 'Acima do patrimônio') : null,
      color: v.pb != null ? (v.pb < 1 ? '#4ebe96' : v.pb < 2 ? '#ffa16c' : '#e05454') : '#868f97',
    },
    {
      label: 'P/S — Preço / Receita',
      value: fmtX(v.ps), raw: v.ps,
      note: v.ps != null ? (v.ps < 2 ? 'Atrativo' : v.ps < 5 ? 'Neutro' : 'Elevado') : null,
      color: v.ps != null ? (v.ps < 2 ? '#4ebe96' : v.ps < 5 ? '#ffa16c' : '#e05454') : '#868f97',
    },
    {
      label: 'EV / EBITDA',
      value: fmtX(v.ev_ebitda), raw: v.ev_ebitda,
      note: v.ev_ebitda != null ? (v.ev_ebitda < 8 ? 'Atrativo' : v.ev_ebitda < 15 ? 'Neutro' : 'Elevado') : null,
      color: v.ev_ebitda != null ? (v.ev_ebitda < 8 ? '#4ebe96' : v.ev_ebitda < 15 ? '#ffa16c' : '#e05454') : '#868f97',
    },
  ]

  const lastDiv = data.dividends_history.length > 0
    ? data.dividends_history[data.dividends_history.length - 1]
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card>
        <SL label="Múltiplos de valuation" />
        {multiples.map(({ label, value, color, note }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <div style={{ fontSize: 13, color: '#cccccc', marginBottom: note ? 4 : 0 }}>{label}</div>
              {note && (
                <div style={{
                  fontSize: 11, color,
                  background: `${color}18`,
                  padding: '1px 8px', borderRadius: 999, display: 'inline-block',
                }}>{note}</div>
              )}
            </div>
            <span style={{ fontSize: 24, fontFamily: 'monospace', fontWeight: 900, color, marginLeft: 16 }}>{value}</span>
          </div>
        ))}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <SL label="Dados por ação" />
          <MRow label="LPA 12M (Lucro/Ação)"    value={f.eps_12m != null ? `R$ ${f.eps_12m.toFixed(2)}` : '—'} color="#a78bfa" />
          <MRow label="DPA (Dividendo/Ação)"     value={lastDiv?.dps != null ? `R$ ${lastDiv.dps.toFixed(2)}` : '—'} color="#f06292" />
          <MRow label="Dividend Yield"            value={fmtPct(f.div_yield)} color="#f06292" />
          <DIV />
          <MRow label="Beta (vol. vs IBOVESPA)"  value={f.beta != null ? f.beta.toFixed(2) : '—'} />
        </Card>

        <Card>
          <SL label="Escala da empresa" />
          <MRow label="Receita anual"     value={fmtCurr(v.revenue)}    color="#479ffa" />
          <MRow label="Lucro líquido"     value={fmtCurr(v.net_income)} color="#4ebe96" />
          <MRow label="Valor de mercado"  value={fmtCurr(f.mkt_cap)}    color="#ffa16c" />
          {v.revenue && v.net_income && (
            <>
              <DIV />
              <MRow
                label="Margem líquida implícita"
                value={`${((v.net_income / v.revenue) * 100).toFixed(1)}%`}
                color="#ffa16c"
              />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Dividendos ────────────────────────────────────────────────────────────────
function ViewDividendos({ data }: { data: FinancialsResponse }) {
  const history = [...data.dividends_history]
    .filter(d => (d.dps ?? 0) > 0)
    .sort((a, b) => a.year - b.year)
    .slice(-12)

  const maxDps = Math.max(...history.map(d => d.dps ?? 0), 0.01)
  const totalDps5y = history.slice(-5).reduce((s, d) => s + (d.dps ?? 0), 0)
  const slice3 = history.slice(-3)
  const avgDps3y = slice3.length > 0
    ? slice3.reduce((s, d) => s + (d.dps ?? 0), 0) / slice3.length
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card>
        <SL label="Histórico de dividendos por ação (DPA)" />
        {history.length === 0 ? (
          <div style={{ color: '#868f97', fontSize: 13 }}>Sem histórico de dividendos disponível</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map(d => {
              const pct = ((d.dps ?? 0) / maxDps) * 100
              return (
                <div key={d.year}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#868f97', fontFamily: 'monospace' }}>{d.year}</span>
                    <span style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: '#f06292' }}>
                      R$ {(d.dps ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'linear-gradient(90deg, #f06292, rgba(240,98,146,0.4))',
                      borderRadius: 4, transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <SL label="Dividend Yield atual" />
          <div style={{
            fontSize: 44, fontFamily: 'monospace', fontWeight: 900,
            color: '#f06292', marginBottom: 4,
          }}>
            {fmtPct(data.facts.div_yield)}
          </div>
          <div style={{ fontSize: 11, color: '#868f97' }}>Sobre o preço atual de mercado</div>
        </Card>

        <Card>
          <SL label="Acumulado" />
          <MRow
            label="Total DPA — últimos 5 anos"
            value={totalDps5y > 0 ? `R$ ${totalDps5y.toFixed(2)}` : '—'}
            color="#f06292"
          />
          <MRow
            label="Média DPA — últimos 3 anos"
            value={avgDps3y != null ? `R$ ${avgDps3y.toFixed(2)}` : '—'}
            color="#ffa16c"
          />
          <DIV />
          <MRow
            label="Anos com distribuição"
            value={String(history.length)}
            color="#4ebe96"
          />
          <MRow
            label="Ano mais recente"
            value={history.length > 0 ? String(history[history.length - 1].year) : '—'}
          />
        </Card>
      </div>
    </div>
  )
}

// ── Rentabilidade ─────────────────────────────────────────────────────────────
function ViewRentabilidade({ data }: { data: FinancialsResponse }) {
  const p = data.profitability

  const metrics = [
    {
      label: 'ROE', full: 'Retorno sobre Patrimônio',
      value: p.roe, color: '#4ebe96', max: 40,
      benchmark: 15, benchmarkLabel: 'mediana setor bancário BR',
      note: p.roe != null
        ? (p.roe > 0.20 ? 'Excelente' : p.roe > 0.12 ? 'Bom' : p.roe > 0 ? 'Abaixo da média' : 'Negativo')
        : null,
    },
    {
      label: 'ROA', full: 'Retorno sobre Ativos',
      value: p.roa, color: '#479ffa', max: 5,
      benchmark: 1.5, benchmarkLabel: 'mediana banco BR',
      note: p.roa != null
        ? (p.roa > 0.02 ? 'Forte' : p.roa > 0.01 ? 'Adequado' : 'Abaixo da média')
        : null,
    },
    {
      label: 'Margem Líq.', full: 'Margem Líquida',
      value: p.net_margin, color: '#ffa16c', max: 60,
      benchmark: 20, benchmarkLabel: 'referência banco BR',
      note: p.net_margin != null
        ? (p.net_margin > 0.30 ? 'Excelente' : p.net_margin > 0.15 ? 'Bom' : 'Abaixo do padrão')
        : null,
    },
    {
      label: 'Margem EBIT', full: 'Margem EBIT (Operacional)',
      value: p.ebit_margin, color: '#a78bfa', max: 60,
      benchmark: 25, benchmarkLabel: 'referência setor',
      note: p.ebit_margin != null
        ? (p.ebit_margin > 0.35 ? 'Excelente' : p.ebit_margin > 0.20 ? 'Bom' : 'Abaixo do padrão')
        : null,
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {metrics.map(({ label: _label, full, value, color, max, benchmark, benchmarkLabel, note }) => {
        const pct = value != null ? Math.min((Math.abs(value * 100) / max) * 100, 100) : 0
        const benchmarkPct = Math.min((benchmark / max) * 100, 100)
        return (
          <Card key={full}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, color: '#868f97', marginBottom: 6,
                  textTransform: 'uppercase', letterSpacing: '0.08em' }}>{full}</div>
                {note && (
                  <div style={{
                    fontSize: 11, color,
                    background: `${color}18`,
                    padding: '2px 10px', borderRadius: 999, display: 'inline-block',
                  }}>{note}</div>
                )}
              </div>
              <div style={{ fontSize: 38, fontFamily: 'monospace', fontWeight: 900, color, marginLeft: 16 }}>
                {fmtPct(value)}
              </div>
            </div>

            {/* Bar with benchmark marker */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <div style={{ height: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}55)`,
                  borderRadius: 999,
                }} />
              </div>
              <div style={{
                position: 'absolute', top: -3, left: `${benchmarkPct}%`,
                width: 2, height: 16, background: 'rgba(255,255,255,0.35)',
                borderRadius: 1, transform: 'translateX(-50%)',
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#868f97' }}>
              ▸ Referência: {benchmark}% ({benchmarkLabel})
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Receita ────────────────────────────────────────────────────────────────────
function ViewReceita({ data }: { data: FinancialsResponse }) {
  const growth = [...data.growth].sort((a, b) => a.year - b.year)
  const maxRev = Math.max(...growth.map(g => g.revenue ?? 0), 1)

  let cagr: number | null = null
  if (growth.length >= 2) {
    const first = growth[0].revenue
    const last  = growth[growth.length - 1].revenue
    const n     = growth.length - 1
    if (first && last && first > 0) cagr = (Math.pow(last / first, 1 / n) - 1) * 100
  }

  const yoyRates = growth.map((g, i) => {
    if (i === 0 || !growth[i - 1].revenue || !g.revenue) return null
    return ((g.revenue - growth[i - 1].revenue!) / Math.abs(growth[i - 1].revenue!)) * 100
  })

  const firstRev = growth[0]?.revenue ?? null
  const lastRev  = growth[growth.length - 1]?.revenue ?? null
  const totalGrowth = (firstRev && lastRev && firstRev > 0)
    ? ((lastRev - firstRev) / Math.abs(firstRev)) * 100
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card>
        <SL label="Evolução da receita" />
        {growth.length === 0 ? (
          <div style={{ color: '#868f97', fontSize: 13 }}>Dados não disponíveis para este papel</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {growth.map((g, i) => {
              const yoy = yoyRates[i]
              const pct = ((g.revenue ?? 0) / maxRev) * 100
              return (
                <div key={g.year}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 14, color: '#cccccc', fontWeight: 700, fontFamily: 'monospace' }}>{g.year}</span>
                      {yoy != null && (
                        <span style={{
                          fontSize: 12, fontFamily: 'monospace',
                          color: yoy >= 0 ? '#4ebe96' : '#e05454',
                          background: yoy >= 0 ? 'rgba(78,190,150,0.12)' : 'rgba(224,84,84,0.12)',
                          padding: '2px 10px', borderRadius: 999,
                        }}>
                          {yoy >= 0 ? '▲' : '▼'} {Math.abs(yoy).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 800, color: '#e6e6e6' }}>
                      {fmtCurr(g.revenue)}
                    </span>
                  </div>
                  <div style={{ height: 26, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'linear-gradient(90deg, #ffa16c, rgba(255,161,108,0.35))',
                      borderRadius: 6, transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <SL label="CAGR (crescimento anualizado)" />
          <div style={{
            fontSize: 46, fontFamily: 'monospace', fontWeight: 900, marginBottom: 6,
            color: cagr != null ? (cagr >= 0 ? '#4ebe96' : '#e05454') : '#868f97',
          }}>
            {cagr != null ? `${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%` : '—'}
          </div>
          <div style={{ fontSize: 11, color: '#868f97' }}>
            {growth.length >= 2
              ? `${growth[0].year}–${growth[growth.length - 1].year} (${growth.length - 1} anos)`
              : 'Período insuficiente para calcular'}
          </div>
        </Card>

        <Card>
          <SL label="Resumo" />
          <MRow label="Receita mais recente" value={fmtCurr(lastRev)}  color="#ffa16c" />
          <MRow label="Receita base"          value={fmtCurr(firstRev)} color="#868f97" />
          {totalGrowth != null && (
            <>
              <DIV />
              <MRow
                label="Crescimento total no período"
                value={`${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(0)}%`}
                color={totalGrowth >= 0 ? '#4ebe96' : '#e05454'}
              />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const SUBTABS = ['Visão geral', 'Demonstrações', 'Estatísticas', 'Dividendos', 'Rentabilidade', 'Receita']

export function FinancialsPanel({ data, loading }: Props) {
  const [active, setActive] = useState(0)

  if (loading || !data) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} height={220} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SUBTABS.map((label, i) => (
          <button key={label} onClick={() => setActive(i)} style={{
            padding: '7px 18px', borderRadius: 999, fontSize: 12,
            cursor: 'pointer', fontFamily: 'monospace',
            background: i === active ? 'rgba(71,159,250,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${i === active ? 'rgba(71,159,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: i === active ? '#479ffa' : '#868f97',
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {active === 0 && <ViewGeral         data={data} />}
      {active === 1 && <ViewDemonstracoes data={data} />}
      {active === 2 && <ViewEstatisticas  data={data} />}
      {active === 3 && <ViewDividendos    data={data} />}
      {active === 4 && <ViewRentabilidade data={data} />}
      {active === 5 && <ViewReceita       data={data} />}
    </div>
  )
}
