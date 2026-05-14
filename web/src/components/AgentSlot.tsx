import { useState } from 'react'
import type { AgentName, AgentOutput, AgentStatus } from '../lib/types'
import { AGENT_LABELS, AGENT_RUNNING_PHRASES } from '../lib/agentLabels'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface AgentSlotProps {
  agent: AgentName
  status: AgentStatus
  elapsed: number | null
  output: AgentOutput | null
}

const STATUS_LEFT_BAR: Record<AgentStatus, string> = {
  pending: 'bg-[rgba(255,255,255,0.08)]',
  running: 'bg-[#479ffa]',
  ok:      'bg-[rgba(71,159,250,0.4)]',
  failed:  'bg-[#e05454]',
}

const STATUS_CARD_BG: Record<AgentStatus, string> = {
  pending: 'glass',
  running: 'glass-accent shadow-[0_0_24px_rgba(71,159,250,0.12)]',
  ok:      'glass',
  failed:  'glass shadow-[0_0_16px_rgba(224,84,84,0.08)]',
}

const STATUS_BADGE_TONE = {
  pending: 'neutral',
  running: 'running',
  ok:      'ok',
  failed:  'failed',
} as const

const STATUS_BADGE_LABEL: Record<AgentStatus, string> = {
  pending: 'aguardando',
  running: 'analisando',
  ok:      'ok',
  failed:  'erro',
}

export function AgentSlot({ agent, status, elapsed, output }: AgentSlotProps) {
  const [expanded, setExpanded] = useState(false)
  const hasOutput = output !== null
  const isRunning = status === 'running'

  return (
    <div className={`relative flex overflow-hidden rounded-lg border transition-all duration-300 ${STATUS_CARD_BG[status]}`}>
      {/* Left accent bar */}
      <div className={`w-0.5 shrink-0 ${STATUS_LEFT_BAR[status]} transition-colors duration-500`} />

      {/* Shimmer overlay for running state */}
      {isRunning && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <span className="absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-data-blue/6 to-transparent animate-shimmer" />
        </span>
      )}

      <div className="flex-1 p-4 min-w-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className={`text-sm font-semibold ${status === 'pending' ? 'text-silver-dust/60' : 'text-polar-white'}`}>
              {AGENT_LABELS[agent]}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={STATUS_BADGE_TONE[status]}>
                {STATUS_BADGE_LABEL[status]}
              </Badge>
              {elapsed !== null && (
                <span className="font-mono text-[11px] text-dim-gray tabular-nums">
                  {elapsed.toFixed(1)}s
                </span>
              )}
            </div>
          </div>

          {hasOutput && (
            <Button
              variant="sharp"
              aria-label={expanded ? 'Colapsar' : 'Expandir'}
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0"
            >
              {expanded ? '−' : '+'}
            </Button>
          )}
        </div>

        {/* Content area */}
        {hasOutput ? (
          <div className="mt-3 animate-fade-up">
            <p className={`text-sm text-silver-dust leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {output.summary}
            </p>
            {expanded && (
              <pre className="mt-3 bg-dark-frost rounded-lg p-3 text-[11px] font-mono text-silver-dust/70 overflow-x-auto border border-light-gray/20">
                {JSON.stringify(output.raw, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <p className={`mt-3 text-sm ${isRunning ? 'text-silver-dust' : 'text-dim-gray'}`}>
            {isRunning ? AGENT_RUNNING_PHRASES[agent] : 'Aguardando início.'}
          </p>
        )}
      </div>
    </div>
  )
}
