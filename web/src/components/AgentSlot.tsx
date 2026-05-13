import { useState } from 'react'
import type { AgentName, AgentOutput, AgentStatus } from '../lib/types'
import { AGENT_LABELS, AGENT_RUNNING_PHRASES } from '../lib/agentLabels'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface AgentSlotProps {
  agent: AgentName
  status: AgentStatus
  elapsed: number | null
  output: AgentOutput | null
}

const STATUS_BADGE_TONE = {
  pending: 'neutral',
  running: 'neutral',
  ok: 'ok',
  failed: 'failed',
} as const

const STATUS_BADGE_LABEL: Record<AgentStatus, string> = {
  pending: 'aguardando',
  running: 'analisando',
  ok: 'ok',
  failed: 'falhou',
}

export function AgentSlot({ agent, status, elapsed, output }: AgentSlotProps) {
  const [expanded, setExpanded] = useState(false)
  const hasOutput = output !== null

  return (
    <Card className="relative overflow-hidden">
      {status === 'running' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'var(--gradient-golden)' }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3
            className={`text-xl font-semibold ${
              status === 'pending' ? 'text-silver-text' : 'text-pure-white'
            }`}
          >
            {AGENT_LABELS[agent]}
          </h3>
          <div className="flex items-center gap-3">
            <Badge tone={STATUS_BADGE_TONE[status]}>
              {STATUS_BADGE_LABEL[status]}
            </Badge>
            {elapsed !== null && (
              <span className="text-xs text-stone-text tabular-nums">
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
          >
            {expanded ? '−' : '+'}
          </Button>
        )}
      </div>

      {hasOutput ? (
        <>
          <p
            className={`mt-4 text-porcelain-text ${
              expanded ? '' : 'line-clamp-2'
            }`}
          >
            {output.summary}
          </p>
          {expanded && (
            <pre className="mt-4 bg-pewter-accent rounded-md p-4 text-[13px] font-mono text-silver-text overflow-x-auto">
              {JSON.stringify(output.raw, null, 2)}
            </pre>
          )}
        </>
      ) : (
        <p
          className={`mt-4 italic ${
            status === 'running' ? 'text-porcelain-text' : 'text-ash-text'
          }`}
        >
          {status === 'running'
            ? AGENT_RUNNING_PHRASES[agent]
            : 'Aguardando início.'}
        </p>
      )}
    </Card>
  )
}
