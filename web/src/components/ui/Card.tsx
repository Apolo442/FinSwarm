import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`bg-slate-gray rounded-md p-8 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
