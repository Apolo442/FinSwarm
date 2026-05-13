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
      className="flex items-center justify-between gap-4 bg-error/8 border border-error/30 rounded-lg px-4 py-3"
    >
      <p className="text-sm text-error">{message}</p>
      {action && (
        <Button variant="ghost" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}
