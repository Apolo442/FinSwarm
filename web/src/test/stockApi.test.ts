import { describe, it, expect, vi } from 'vitest'
import { fetchOverview, fetchStockNews } from '../lib/stockApi'

describe('stockApi', () => {
  it('fetchOverview chama /stock/X/overview', async () => {
    const spy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ticker: 'PETR4.SA' }), { status: 200 })
    )
    await fetchOverview('PETR4')
    expect(spy).toHaveBeenCalledWith('/stock/PETR4/overview')
    spy.mockRestore()
  })

  it('fetchStockNews aceita limit', async () => {
    const spy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 })
    )
    await fetchStockNews('PETR4', 10)
    expect(spy).toHaveBeenCalledWith('/stock/PETR4/news?limit=10')
    spy.mockRestore()
  })
})
