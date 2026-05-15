interface Props { height?: number | string; className?: string }

export function SkeletonCard({ height = 80, className = '' }: Props) {
  return (
    <div className={`shimmer ${className}`}
      style={{ height, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}
      aria-busy="true"
    />
  )
}
