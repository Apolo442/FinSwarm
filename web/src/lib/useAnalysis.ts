import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AGENT_ORDER,
  type AgentName,
  type AgentState,
  type AnalysisResult,
  type WsEvent,
} from './types'

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
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/${jobId}`
}

export function useAnalysis(jobId: string): UseAnalysisReturn {
  const [state, setState] = useState<UseAnalysisState>(initialState)
  const [generation, setGeneration] = useState(0)
  const doneOrErrorRef = useRef<boolean>(false)
  const didOpenRef = useRef<boolean>(false)

  useEffect(() => {
    const ws = new WebSocket(buildWsUrl(jobId))
    doneOrErrorRef.current = false
    didOpenRef.current = false

    ws.onopen = () => {
      didOpenRef.current = true
    }

    ws.onmessage = (msg) => {
      let parsed: WsEvent
      try {
        parsed = JSON.parse(msg.data) as WsEvent
      } catch {
        return
      }
      setState((prev) => {
        const isAgentEvent = parsed.event === 'agent_start' || parsed.event === 'agent_done'
        if (isAgentEvent && !AGENT_ORDER.includes(parsed.agent)) {
          return prev
        }
        switch (parsed.event) {
          case 'agent_start':
            return {
              ...prev,
              currentAgent: parsed.agent,
              agents: {
                ...prev.agents,
                [parsed.agent]: { status: 'running', elapsed: parsed.elapsed },
              },
            }
          case 'agent_done':
            return {
              ...prev,
              agents: {
                ...prev.agents,
                [parsed.agent]: { status: 'ok', elapsed: parsed.elapsed },
              },
            }
          case 'done': {
            doneOrErrorRef.current = true
            const reconciled = { ...prev.agents }
            for (const name of AGENT_ORDER) {
              const agentOutput = parsed.result.agents[name]
              const finalStatus = agentOutput?.status === 'failed' ? 'failed' : 'ok'
              reconciled[name] = {
                status: finalStatus,
                elapsed: reconciled[name].elapsed,
              }
            }
            return {
              ...prev,
              agents: reconciled,
              currentAgent: null,
              result: parsed.result,
            }
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

    return () => {
      ws.close()
    }
  }, [jobId, generation])

  const reconnect = useCallback(() => {
    setState((prev) => ({ ...prev, connectionLost: false, error: null }))
    setGeneration((g) => g + 1)
  }, [])

  return { ...state, reconnect }
}
