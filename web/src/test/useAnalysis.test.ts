import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { WebSocket as MockWebSocket, Server } from 'mock-socket'
// reset registry between tests since hook cleanup races with server.close()
import { useAnalysis } from '../lib/useAnalysis'
import type { AnalysisResult } from '../lib/types'

const WS_URL = 'ws://localhost/ws/abc123'

const originalWebSocket = globalThis.WebSocket

beforeEach(() => {
  // @ts-expect-error mock-socket WebSocket has slightly different signature
  globalThis.WebSocket = MockWebSocket
})

afterEach(() => {
  globalThis.WebSocket = originalWebSocket
})

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    job_id: 'abc123',
    ticker: 'PETR4.SA',
    timestamp: '2026-05-12T12:00:00Z',
    recommendation: 'COMPRAR',
    confidence: 0.78,
    risk_score: 42,
    stop_loss_pct: 5.0,
    agents: {
      technical: { status: 'ok', summary: 's', raw: {} },
      fundamental: { status: 'ok', summary: 's', raw: {} },
      sentiment: { status: 'ok', summary: 's', raw: {} },
      bull: { status: 'ok', summary: 's', raw: {} },
      bear: { status: 'ok', summary: 's', raw: {} },
      risk: { status: 'ok', summary: 's', raw: {} },
      synthesis: { status: 'ok', summary: 's', raw: {} },
    },
    elapsed_seconds: 540,
    cost_usd: 0,
    ...overrides,
  }
}

describe('useAnalysis', () => {
  it('inicializa todos os 7 agentes como pending', () => {
    const server = new Server(WS_URL)
    const { result } = renderHook(() => useAnalysis('abc123'))
    expect(result.current.agents.technical.status).toBe('pending')
    expect(result.current.agents.synthesis.status).toBe('pending')
    expect(result.current.result).toBeNull()
    server.close()
  })

  it('marca agente como running em agent_start', async () => {
    const server = new Server(WS_URL)
    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'agent_start', agent: 'technical', elapsed: 0 }))
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.agents.technical.status).toBe('running')
      expect(result.current.currentAgent).toBe('technical')
    })
    server.close()
  })

  it('marca agente como ok em agent_done', async () => {
    const server = new Server(WS_URL)
    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'agent_start', agent: 'technical', elapsed: 0 }))
      socket.send(JSON.stringify({ event: 'agent_done', agent: 'technical', elapsed: 14.2 }))
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.agents.technical.status).toBe('ok')
      expect(result.current.agents.technical.elapsed).toBe(14.2)
    })
    server.close()
  })

  it('salva result em done e reconcilia status failed', async () => {
    const server = new Server(WS_URL)
    const finalResult = makeResult({
      agents: {
        ...makeResult().agents,
        sentiment: { status: 'failed', summary: 'falhou', raw: {} },
      },
    })
    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'done', result: finalResult, elapsed: 540 }))
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.result).not.toBeNull()
      expect(result.current.agents.sentiment.status).toBe('failed')
    })
    server.close()
  })

  it('seta error em evento error', async () => {
    const server = new Server(WS_URL)
    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'error', message: 'job_id não encontrado' }))
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.error).toBe('job_id não encontrado')
    })
    server.close()
  })

  it('seta connectionLost quando WS fecha antes de done', async () => {
    const server = new Server(WS_URL)
    server.on('connection', (socket) => {
      socket.close()
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.connectionLost).toBe(true)
    })
    server.close()
  })

  it('reconnect zera connectionLost e reabre WS', async () => {
    const server = new Server(WS_URL)
    let connectionCount = 0
    server.on('connection', (socket) => {
      connectionCount++
      if (connectionCount === 1) socket.close()
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => expect(result.current.connectionLost).toBe(true))
    act(() => {
      result.current.reconnect()
    })
    await waitFor(() => {
      expect(connectionCount).toBe(2)
      expect(result.current.connectionLost).toBe(false)
    })
    server.close()
  })
})
