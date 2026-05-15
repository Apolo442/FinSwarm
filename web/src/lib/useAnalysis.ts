import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AGENT_ORDER,
  type AgentName,
  type AgentState,
  type AnalysisResult,
  type WsEvent,
} from './types'
import { fetchAnalysis } from './api'

interface UseAnalysisState {
  agents: Record<AgentName, AgentState>
  currentAgent: AgentName | null
  result: AnalysisResult | null
  error: string | null
  connectionLost: boolean
}

interface UseAnalysisReturn extends UseAnalysisState {
  reconnect: () => void
}

function initialAgents(): Record<AgentName, AgentState> {
  return AGENT_ORDER.reduce((acc, name) => {
    acc[name] = { status: 'pending', elapsed: null }
    return acc
  }, {} as Record<AgentName, AgentState>)
}

function initialState(): UseAnalysisState {
  return {
    agents: initialAgents(),
    currentAgent: null,
    result: null,
    error: null,
    connectionLost: false,
  }
}

function buildWsUrl(jobId: string): string {
  if (typeof window === 'undefined') {
    return `ws://localhost/ws/${jobId}`
  }
  if (import.meta.env.DEV && window.location.port === '5173') {
    return `ws://localhost:8000/ws/${jobId}`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/${jobId}`
}

function resultToAgents(result: AnalysisResult): Record<AgentName, AgentState> {
  return AGENT_ORDER.reduce((acc, name) => {
    const out = result.agents[name]
    acc[name] = { status: out?.status === 'failed' ? 'failed' : 'ok', elapsed: null }
    return acc
  }, {} as Record<AgentName, AgentState>)
}

export function useAnalysis(jobId: string): UseAnalysisReturn {
  const [state, setState] = useState<UseAnalysisState>(initialState)
  const [generation, setGeneration] = useState(0)
  const doneOrErrorRef = useRef<boolean>(false)
  const didOpenRef = useRef<boolean>(false)
  const cancelledRef = useRef<boolean>(false)

  useEffect(() => {
    doneOrErrorRef.current = false
    didOpenRef.current = false
    cancelledRef.current = false
    setState(initialState())

    // Tenta REST primeiro — análises já concluídas existem só no SQLite, não no WS
    fetchAnalysis(jobId).then(result => {
      if (cancelledRef.current) return
      doneOrErrorRef.current = true
      setState(prev => ({
        ...prev,
        agents: resultToAgents(result),
        currentAgent: null,
        result,
      }))
    }).catch(() => {
      // Não achou no banco → abre WebSocket (análise ainda em andamento)
      if (cancelledRef.current) return
      openWebSocket()
    })

    let ws: WebSocket | null = null

    function openWebSocket() {
      ws = new WebSocket(buildWsUrl(jobId))
      didOpenRef.current = false

      ws.onopen = () => { didOpenRef.current = true }

      ws.onmessage = (msg) => {
        let parsed: WsEvent
        try { parsed = JSON.parse(msg.data) as WsEvent } catch { return }
        setState((prev) => {
          if (
            (parsed.event === 'agent_start' || parsed.event === 'agent_done') &&
            !AGENT_ORDER.includes(parsed.agent)
          ) return prev
          switch (parsed.event) {
            case 'agent_start':
              return {
                ...prev, currentAgent: parsed.agent,
                agents: { ...prev.agents, [parsed.agent]: { status: 'running', elapsed: parsed.elapsed } },
              }
            case 'agent_done':
              return {
                ...prev,
                agents: { ...prev.agents, [parsed.agent]: { status: 'ok', elapsed: parsed.elapsed } },
              }
            case 'done': {
              doneOrErrorRef.current = true
              const reconciled = { ...prev.agents }
              for (const name of AGENT_ORDER) {
                const out = parsed.result.agents[name]
                reconciled[name] = { status: out?.status === 'failed' ? 'failed' : 'ok', elapsed: reconciled[name].elapsed }
              }
              return { ...prev, agents: reconciled, currentAgent: null, result: parsed.result }
            }
            case 'error':
              doneOrErrorRef.current = true
              return { ...prev, error: parsed.message }
            default:
              return prev
          }
        })
      }

      ws.onclose = () => {
        if (!doneOrErrorRef.current && didOpenRef.current) {
          setState((prev) => ({ ...prev, connectionLost: true }))
        }
      }
    }

    return () => {
      cancelledRef.current = true
      ws?.close()
    }
  }, [jobId, generation])

  const reconnect = useCallback(() => {
    setState((prev) => ({ ...prev, connectionLost: false, error: null }))
    setGeneration((g) => g + 1)
  }, [])

  return { ...state, reconnect }
}
