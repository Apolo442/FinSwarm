interface NewsItemProps {
  title: string; source: string
  url: string | null; published_at: string | null
  sentiment: 'POS' | 'NEG' | 'NEU' | null
  summary?: string | null
}
const COLORS = {
  POS: { bg: 'rgba(78,190,150,0.12)', fg: '#4ebe96' },
  NEG: { bg: 'rgba(255,107,107,0.12)', fg: '#ff6b6b' },
  NEU: { bg: 'rgba(134,143,151,0.12)', fg: '#868f97' },
}
export function NewsItem({ title, source, url, published_at, sentiment, summary }: NewsItemProps) {
  const Wrap: any = url ? 'a' : 'div'
  const wrapProps: any = url ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : {}
  return (
    <Wrap {...wrapProps} style={{
      display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 18, alignItems: 'center',
      padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
      textDecoration: 'none', cursor: url ? 'pointer' : 'default',
    }}>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}>
        {published_at || '—'}
      </span>
      <div>
        <div style={{ fontSize: 14, color: '#e6e6e6', lineHeight: 1.5 }}>{title}</div>
        {summary && <div style={{ fontSize: 11, color: '#868f97', marginTop: 5 }}>{summary}</div>}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {sentiment && (
          <span style={{ fontFamily: 'monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4,
            fontWeight: 700, ...COLORS[sentiment] }}>{sentiment}</span>
        )}
        <span style={{ fontFamily: 'monospace', fontSize: 10, padding: '3px 9px', borderRadius: 999,
          background: 'rgba(71,159,250,0.08)', color: '#479ffa',
          border: '1px solid rgba(71,159,250,0.2)' }}>{source}</span>
      </div>
    </Wrap>
  )
}
