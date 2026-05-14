import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportHero } from '../components/ReportHero'
import type { AnalysisResult } from '../lib/types'

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    job_id: 'abc', ticker: 'PETR4.SA', timestamp: '2026-05-12T12:00:00Z',
    recommendation: 'COMPRAR', confidence: 0.78, risk_score: 42,
    stop_loss_pct: 5.2, agents: {} as AnalysisResult['agents'],
    elapsed_seconds: 54, cost_usd: 0, ...overrides,
  }
}

describe('ReportHero', () => {
  it('mostra recomendação em Solar Flare', () => {
    render(<ReportHero result={makeResult()} />)
    const el = screen.getByTestId('recommendation')
    expect(el).toHaveTextContent('COMPRAR')
    expect(el).toHaveStyle({ color: '#ffa16c' })
  })

  it('mostra ticker e confiança', () => {
    render(<ReportHero result={makeResult()} />)
    expect(screen.getByText(/PETR4\.SA/)).toBeInTheDocument()
    expect(screen.getAllByText(/78%/).length).toBeGreaterThan(0)
  })

  it('mostra risco', () => {
    render(<ReportHero result={makeResult()} />)
    expect(screen.getByText(/risco 42/i)).toBeInTheDocument()
  })

  it('renderiza PriceChart', () => {
    render(<ReportHero result={makeResult()} />)
    expect(screen.getByText('3M')).toBeInTheDocument()
  })
})
