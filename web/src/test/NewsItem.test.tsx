import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewsItem } from '../components/stock/widgets/NewsItem'

describe('NewsItem', () => {
  it('renderiza título e fonte', () => {
    render(<NewsItem title="BB sobe forte" source="Reuters" url="https://r.com/x"
      published_at="2026-05-14" sentiment="POS" />)
    expect(screen.getByText('BB sobe forte')).toBeInTheDocument()
    expect(screen.getByText('Reuters')).toBeInTheDocument()
  })
  it('link tem target _blank', () => {
    render(<NewsItem title="t" source="s" url="https://x.com" published_at={null} sentiment={null} />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
  })
})
