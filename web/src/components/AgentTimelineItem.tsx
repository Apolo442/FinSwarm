import type { AgentName, AgentStatus } from '../lib/types'
import { AGENT_LABELS } from '../lib/agentLabels'

interface AgentTimelineItemProps {
  agent: AgentName
  index: number
  status: AgentStatus
  elapsed: number | null
  isLast: boolean
}

const STATUS_RING_CLASSES: Record<AgentStatus, string> = {
  pending: 'border-silver-text/25 text-stone-text bg-obsidian-surface',
  running: 'border-golden text-pure-white bg-pewter-accent animate-pulse-golden',
  ok: 'border-pure-white text-pure-white bg-pewter-accent',
  failed: 'border-status-failed text-status-failed bg-pewter-accent',
}

const STATUS_LABEL_CLASSES: Record<AgentStatus, string> = {
  pending: 'text-ash-text',
  running: 'text-pure-white',
  ok: 'text-pure-white',
  failed: 'text-status-failed',
}

const STATUS_SUB: Record<AgentStatus, string> = {
  pending: 'aguardando',
  running: 'em execução',
  ok: 'concluído',
  failed: 'falhou',
}

export function AgentTimelineItem({
  agent,
  index,
  status,
  elapsed,
  isLast,
}: AgentTimelineItemProps) {
  return (
    <li className="relative flex items-stretch gap-4 pb-6 last:pb-0">
      <div className="relative flex flex-col items-center">
        <span
          data-testid={`agent-status-${agent}`}
          data-status={status}
          className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-pill border tabular-nums text-sm font-medium ${STATUS_RING_CLASSES[status]}`}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {!isLast && (
          <span
            aria-hidden
            className={`flex-1 w-px mt-1 ${
              status === 'ok' || status === 'failed'
                ? 'bg-silver-text/40'
                : 'bg-silver-text/15'
            }`}
          />
        )}
      </div>
      <div className="flex-1 pt-1.5 flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className={`text-base font-medium ${STATUS_LABEL_CLASSES[status]}`}>
            {AGENT_LABELS[agent]}
          </span>
          {elapsed !== null && (
            <span className="text-xs text-stone-text tabular-nums">
              {elapsed.toFixed(1)}s
            </span>
          )}
        </div>
        <span className="text-xs uppercase tracking-wider text-stone-text">
          {STATUS_SUB[status]}
        </span>
      </div>
    </li>
  )
}
