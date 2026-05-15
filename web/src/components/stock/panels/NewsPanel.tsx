import type { NewsResponse } from '../../../lib/stockApi'
import { NewsItem } from '../widgets/NewsItem'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: NewsResponse | null; loading: boolean }

export function NewsPanel({ data, loading }: Props) {
  if (loading || !data) {
    return <div className="glass" style={{ padding: 22 }}>
      {[1,2,3,4,5].map(i => <SkeletonCard key={i} height={70} />)}
    </div>
  }
  if (data.items.length === 0) {
    return <div className="glass" style={{ padding: 32, textAlign: 'center', color: '#868f97' }}>
      Sem notícias disponíveis no momento.
    </div>
  }
  return (
    <div className="glass" style={{ padding: '26px 32px' }}>
      <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
        Notícias recentes
      </h3>
      {data.items.map((n, i) => <NewsItem key={i} {...n} />)}
    </div>
  )
}
