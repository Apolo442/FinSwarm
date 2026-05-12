import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentTimeline } from '../components/AgentTimeline'
import { AGENT_ORDER, type AgentState, type AgentName } from '../lib/types'

function makeAgents(overrides: Partial<Record<AgentName, AgentState>> = {}): Record<AgentName, AgentState> {
  const base = AGENT_ORDER.reduce((acc, n) => {
    acc[n] = { status: 'pending', elapsed: null }
    return acc
  }, {} as Record<AgentName, AgentState>)
  return { ...base, ...overrides }
}

describe('AgentTimeline', () => {
  it('renderiza os 7 agentes na ordem correta', () => {
    render(<AgentTimeline agents={makeAgents()} />)
    expect(screen.getByText('Análise técnica')).toBeInTheDocument()
    expect(screen.getByText('Síntese final')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(7)
  })

  it('mostra elapsed quando disponível', () => {
    render(
      <AgentTimeline agents={makeAgents({ technical: { status: 'ok', elapsed: 14.2 } })} />
    )
    expect(screen.getByText('14.2s')).toBeInTheDocument()
  })

  it('aplica data-status correto por agente', () => {
    render(
      <AgentTimeline
        agents={makeAgents({
          technical: { status: 'running', elapsed: 1.0 },
          fundamental: { status: 'ok', elapsed: 12.0 },
          sentiment: { status: 'failed', elapsed: 9.0 },
        })}
      />
    )
    expect(screen.getByTestId('agent-status-technical')).toHaveAttribute('data-status', 'running')
    expect(screen.getByTestId('agent-status-fundamental')).toHaveAttribute('data-status', 'ok')
    expect(screen.getByTestId('agent-status-sentiment')).toHaveAttribute('data-status', 'failed')
    expect(screen.getByTestId('agent-status-bull')).toHaveAttribute('data-status', 'pending')
  })
})
