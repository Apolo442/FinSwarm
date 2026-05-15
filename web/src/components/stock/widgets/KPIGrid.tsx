import { ReactNode } from 'react'
interface KPIGridProps { children: ReactNode; columns?: number }
export function KPIGrid({ children, columns = 6 }: KPIGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10 }}>
      {children}
    </div>
  )
}
