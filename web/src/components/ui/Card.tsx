import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`glass rounded-lg p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
