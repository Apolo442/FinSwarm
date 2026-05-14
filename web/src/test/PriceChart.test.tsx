import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PriceChart } from '../components/PriceChart'
import * as api from '../lib/api'

const mockBars = [
  { time: 1700000000, open: 35, high: 37, low: 34, close: 36, volume: 1000000 },
  { time: 1700086400, open: 36, high: 38, low: 35, close: 37, volume: 1200000 },
]

describe('PriceChart', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchChart').mockResolvedValue(mockBars)
  })

  it('chama fetchChart com ticker e period padrão', async () => {
    render(<PriceChart ticker="PETR4.SA" />)
    await waitFor(() => expect(api.fetchChart).toHaveBeenCalledWith('PETR4.SA', '3mo'))
  })

  it('renderiza botões de período', async () => {
    render(<PriceChart ticker="PETR4.SA" />)
    await waitFor(() => expect(api.fetchChart).toHaveBeenCalled())
    expect(screen.getByText('1M')).toBeInTheDocument()
    expect(screen.getByText('3M')).toBeInTheDocument()
    expect(screen.getByText('6M')).toBeInTheDocument()
    expect(screen.getByText('1A')).toBeInTheDocument()
  })

  it('re-fetcha ao trocar período', async () => {
    render(<PriceChart ticker="PETR4.SA" />)
    await waitFor(() => expect(api.fetchChart).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByText('6M'))
    await waitFor(() => expect(api.fetchChart).toHaveBeenCalledWith('PETR4.SA', '6mo'))
  })
})
