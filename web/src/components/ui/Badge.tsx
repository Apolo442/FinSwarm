import type { ReactNode } from 'react'

type Tone = 'ok' | 'failed' | 'neutral'

interface BadgeProps {
  tone: Tone
  children: ReactNode
}

const TONE_CLASSES: Record<Tone, string> = {
  ok: 'bg-pure-white/10 text-pure-white',
  failed: 'bg-status-failed/20 text-status-failed',
  neutral: 'bg-pewter-accent text-silver-text',
}

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}
