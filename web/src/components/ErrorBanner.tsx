import type { ReactNode } from 'react'
import { Button } from './ui/Button'

interface ErrorBannerProps {
  message: string
  action?: { label: string; onClick: () => void }
  children?: ReactNode
}

export function ErrorBanner({ message, action, children }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 bg-status-failed/10 border border-status-failed/40 rounded-md px-4 py-3"
    >
      <p className="text-sm text-status-failed">{message}</p>
      {action && (
        <Button variant="ghost" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}
