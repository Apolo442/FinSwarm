import type { AgentName, AgentStatus } from '../lib/types'
import { AGENT_LABELS } from '../lib/agentLabels'

interface AgentTimelineItemProps {
  agent: AgentName
  status: AgentStatus
  elapsed: number | null
  isLast: boolean
}

const STATUS_DOT_CLASSES: Record<AgentStatus, string> = {
  pending: 'bg-stone-text',
  running: 'bg-golden animate-pulse-golden',
  ok: 'bg-pure-white',
  failed: 'bg-status-failed',
}

const STATUS_LABEL_CLASSES: Record<AgentStatus, string> = {
  pending: 'text-ash-text',
  running: 'text-pure-white',
  ok: 'text-pure-white',
  failed: 'text-status-failed',
}

export function AgentTimelineItem({ agent, status, elapsed, isLast }: AgentTimelineItemProps) {
  return (
    <li className="relative flex items-start gap-4 pb-6">
      <div className="relative flex flex-col items-center">
        <span
          data-testid={`agent-status-${agent}`}
          data-status={status}
          className={`h-2 w-2 rounded-pill mt-2 ${STATUS_DOT_CLASSES[status]}`}
        />
        {!isLast && <span className="flex-1 w-px bg-silver-text/30 mt-1" />}
      </div>
      <div className="flex-1 flex items-baseline justify-between">
        <span className={`text-base font-medium ${STATUS_LABEL_CLASSES[status]}`}>
          {AGENT_LABELS[agent]}
        </span>
        {elapsed !== null && (
          <span className="text-xs text-stone-text tabular-nums">
            {elapsed.toFixed(1)}s
          </span>
        )}
      </div>
    </li>
  )
}
