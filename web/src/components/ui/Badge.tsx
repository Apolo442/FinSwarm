import type { ReactNode } from 'react'

type Tone = 'ok' | 'failed' | 'neutral' | 'running'

interface BadgeProps {
  tone: Tone
  children: ReactNode
}

const TONE_CLASSES: Record<Tone, string> = {
  ok: 'bg-data-blue/15 text-data-blue',
  running: 'bg-data-blue/15 text-data-blue',
  failed: 'bg-error/15 text-error',
  neutral: 'bg-dark-frost text-dim-gray',
}

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}
