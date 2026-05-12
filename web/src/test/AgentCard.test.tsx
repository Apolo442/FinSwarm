import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentCard } from '../components/AgentCard'
import type { AgentOutput } from '../lib/types'

const output: AgentOutput = {
  status: 'ok',
  summary: 'Tendência de alta com RSI em 62.',
  raw: { rsi: 62, macd: 'bullish' },
}

describe('AgentCard', () => {
  it('mostra nome, badge ok e summary quando colapsado', () => {
    render(<AgentCard agent="technical" output={output} />)
    expect(screen.getByText('Análise técnica')).toBeInTheDocument()
    expect(screen.getByText(/RSI em 62/)).toBeInTheDocument()
    expect(screen.queryByText(/"rsi": 62/)).not.toBeInTheDocument()
  })

  it('expande e mostra raw em JSON ao clicar', async () => {
    render(<AgentCard agent="technical" output={output} />)
    await userEvent.click(screen.getByRole('button', { name: /expandir/i }))
    expect(screen.getByText(/"rsi": 62/)).toBeInTheDocument()
  })

  it('mostra badge "falhou" quando status=failed', () => {
    render(
      <AgentCard
        agent="sentiment"
        output={{ status: 'failed', summary: 'rate limit', raw: {} }}
      />
    )
    expect(screen.getByText(/falhou/i)).toBeInTheDocument()
  })
})
