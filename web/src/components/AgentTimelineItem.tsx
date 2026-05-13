import type { AgentName, AgentStatus } from '../lib/types'
import { AGENT_LABELS } from '../lib/agentLabels'

interface AgentTimelineItemProps {
  agent: AgentName
  index: number
  status: AgentStatus
  elapsed: number | null
  isLast: boolean
}

const STATUS_BADGE: Record<AgentStatus, string> = {
  pending: 'border border-light-gray/25 text-dim-gray bg-transparent',
  running: 'border border-data-blue text-data-blue bg-data-blue/10 animate-pulse-blue shadow-[0_0_12px_rgba(103,152,255,0.25)]',
  ok:      'border border-data-blue/50 text-data-blue bg-data-blue/8',
  failed:  'border border-error text-error bg-error/8',
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  pending: 'text-dim-gray',
  running: 'text-polar-white font-medium',
  ok:      'text-silver-dust',
  failed:  'text-error',
}

const STATUS_SUB: Record<AgentStatus, string> = {
  pending: 'aguardando',
  running: 'em execução',
  ok:      'concluído',
  failed:  'falhou',
}

const STATUS_SUB_COLOR: Record<AgentStatus, string> = {
  pending: 'text-dim-gray',
  running: 'text-data-blue',
  ok:      'text-dim-gray',
  failed:  'text-error',
}

export function AgentTimelineItem({ agent, index, status, elapsed, isLast }: AgentTimelineItemProps) {
  const isRunning = status === 'running'

  return (
    <li className="relative flex items-stretch gap-3 pb-1 last:pb-0">
      {/* Glass highlight on running item */}
      {isRunning && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[-12px] top-0 bottom-4 rounded-lg glass-blue"
        />
      )}

      {/* Number badge + connector */}
      <div className="relative z-10 flex flex-col items-center shrink-0">
        <span
          data-testid={`agent-status-${agent}`}
          data-status={status}
          className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[11px] font-medium shrink-0 transition-all duration-300 ${STATUS_BADGE[status]}`}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {!isLast && (
          <span
            aria-hidden
            className={`w-px flex-1 mt-1 mb-1 transition-colors duration-500 ${
              status === 'ok' ? 'bg-data-blue/25' : 'bg-light-gray/15'
            }`}
          />
        )}
      </div>

      {/* Label area */}
      <div className="relative z-10 flex-1 flex flex-col gap-0.5 py-0.5 pb-4 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-sm transition-colors duration-300 ${STATUS_LABEL[status]}`}>
            {AGENT_LABELS[agent]}
          </span>
          {elapsed !== null && (
            <span className="font-mono text-[11px] text-dim-gray tabular-nums shrink-0">
              {elapsed.toFixed(1)}s
            </span>
          )}
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-widest transition-colors duration-300 ${STATUS_SUB_COLOR[status]}`}>
          {STATUS_SUB[status]}
        </span>
      </div>
    </li>
  )
}
