import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentBento } from '../components/AgentBento'
import type { AnalysisResult } from '../lib/types'

function makeResult(agentOverrides: Partial<AnalysisResult['agents']> = {}): AnalysisResult {
  const base = {
    status: 'ok' as const,
    summary: 'Resumo de teste.',
    raw: {},
  }
  return {
    job_id: 'x', ticker: 'PETR4.SA', timestamp: '2026-05-13T00:00:00Z',
    recommendation: 'COMPRAR', confidence: 0.82, risk_score: 42,
    stop_loss_pct: 7.5, elapsed_seconds: 60, cost_usd: 0,
    agents: {
      technical:    { ...base, raw: { signal: 'ALTA', rsi_interpretation: 'neutro', macd_interpretation: 'positivo', bollinger_position: 'ENTRE_BANDAS', support_level: 35, resistance_level: 41 } },
      fundamental:  { ...base, raw: { health: 'BOA', valuation: 'BARATO', debt_risk: 'BAIXO', roe_interpretation: 'bom', _metrics: { pl: 6.2, pvp: 0.9, roe_pct: 18, divida_bruta_pl: 0.82, margem_ebit_pct: 24 } } },
      sentiment:    { ...base, raw: { score: 0.7, label: 'POSITIVO', catalysts: ['alta petróleo'], risks: ['risco político'] } },
      bull:         { ...base, raw: { arguments: ['arg1', 'arg2', 'arg3'], conviction: 'ALTA' } },
      bear:         { ...base, raw: { arguments: ['risco1', 'risco2', 'risco3'], conviction: 'MODERADA' } },
      risk:         { ...base, raw: { risk_score: 42, stop_loss_pct: 7.5, max_exposure_pct: 5, risk_label: 'MODERADO', main_risks: ['volatilidade', 'câmbio'] } },
      synthesis:    { ...base, raw: { recommendation: 'COMPRAR', confidence: 0.82, reasoning: 'Fundamentos sólidos justificam a compra.' } },
      ...agentOverrides,
    },
  }
}

describe('AgentBento', () => {
  it('renderiza os 7 cards de agente', () => {
    render(<AgentBento result={makeResult()} />)
    expect(screen.getByText('Análise Técnica')).toBeInTheDocument()
    expect(screen.getByText('Fundamentalista')).toBeInTheDocument()
    expect(screen.getByText('Sentimento')).toBeInTheDocument()
    expect(screen.getByText('Tese de Alta')).toBeInTheDocument()
    expect(screen.getByText('Tese de Baixa')).toBeInTheDocument()
    expect(screen.getByText('Risco')).toBeInTheDocument()
    expect(screen.getByText('Síntese Final')).toBeInTheDocument()
  })

  it('exibe signal técnico', () => {
    render(<AgentBento result={makeResult()} />)
    expect(screen.getAllByText('ALTA').length).toBeGreaterThan(0)
  })

  it('exibe argumentos bull', () => {
    render(<AgentBento result={makeResult()} />)
    expect(screen.getByText('arg1')).toBeInTheDocument()
  })

  it('exibe reasoning da síntese', () => {
    render(<AgentBento result={makeResult()} />)
    expect(screen.getByText(/Fundamentos sólidos/)).toBeInTheDocument()
  })

  it('trata agente com status failed sem crash', () => {
    const r = makeResult({ technical: { status: 'failed', summary: 'erro', raw: {} } })
    expect(() => render(<AgentBento result={r} />)).not.toThrow()
  })
})
