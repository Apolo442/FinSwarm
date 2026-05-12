import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportHero } from '../components/ReportHero'
import type { AnalysisResult } from '../lib/types'

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    job_id: 'abc',
    ticker: 'PETR4.SA',
    timestamp: '2026-05-12T12:00:00Z',
    recommendation: 'COMPRAR',
    confidence: 0.78,
    risk_score: 42,
    stop_loss_pct: 5.2,
    agents: {} as AnalysisResult['agents'],
    elapsed_seconds: 540,
    cost_usd: 0,
    ...overrides,
  }
}

describe('ReportHero', () => {
  it('mostra recomendação, ticker e stats formatados', () => {
    render(<ReportHero result={makeResult()} />)
    expect(screen.getByRole('heading', { name: 'COMPRAR' })).toBeInTheDocument()
    expect(screen.getByText('PETR4.SA')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.getByText('42/100')).toBeInTheDocument()
    expect(screen.getByText('5.2%')).toBeInTheDocument()
  })

  it('aplica data-recommendation para estilização condicional', () => {
    const { rerender } = render(<ReportHero result={makeResult({ recommendation: 'VENDER' })} />)
    expect(screen.getByRole('heading', { name: 'VENDER' })).toHaveAttribute(
      'data-recommendation',
      'VENDER'
    )
    rerender(<ReportHero result={makeResult({ recommendation: 'MANTER' })} />)
    expect(screen.getByRole('heading', { name: 'MANTER' })).toHaveAttribute(
      'data-recommendation',
      'MANTER'
    )
  })
})
