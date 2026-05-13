import type { AgentName, AgentState } from '../lib/types'
import { AGENT_ORDER } from '../lib/types'
import { AgentTimelineItem } from './AgentTimelineItem'

interface AgentTimelineProps {
  agents: Record<AgentName, AgentState>
}

export function AgentTimeline({ agents }: AgentTimelineProps) {
  return (
    <ol className="list-none p-0 m-0">
      {AGENT_ORDER.map((name, idx) => (
        <AgentTimelineItem
          key={name}
          agent={name}
          index={idx}
          status={agents[name].status}
          elapsed={agents[name].elapsed}
          isLast={idx === AGENT_ORDER.length - 1}
        />
      ))}
    </ol>
  )
}
