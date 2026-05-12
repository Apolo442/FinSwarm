import { useState } from 'react'
import type { AgentName, AgentOutput } from '../lib/types'
import { AGENT_LABELS } from '../lib/agentLabels'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface AgentCardProps {
  agent: AgentName
  output: AgentOutput
}

export function AgentCard({ agent, output }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-pure-white">{AGENT_LABELS[agent]}</h3>
          <Badge tone={output.status === 'ok' ? 'ok' : 'failed'}>
            {output.status === 'ok' ? 'ok' : 'falhou'}
          </Badge>
        </div>
        <Button
          variant="sharp"
          aria-label={expanded ? 'Colapsar' : 'Expandir'}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '−' : '+'}
        </Button>
      </div>
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
    </Card>
  )
}
