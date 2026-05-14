import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StockQuickPicks } from '../components/StockQuickPicks'

describe('StockQuickPicks', () => {
  it('renderiza os 10 tickers', () => {
    render(<StockQuickPicks onSelect={vi.fn()} />)
    const tickers = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','B3SA3','BBAS3','MGLU3','RENT3']
    tickers.forEach(t => expect(screen.getByText(t)).toBeInTheDocument())
  })

  it('chama onSelect com ticker.SA ao clicar', () => {
    const onSelect = vi.fn()
    render(<StockQuickPicks onSelect={onSelect} />)
    fireEvent.click(screen.getByText('PETR4').closest('button')!)
    expect(onSelect).toHaveBeenCalledWith('PETR4.SA')
  })

  it('renderiza nomes de empresa', () => {
    render(<StockQuickPicks onSelect={vi.fn()} />)
    expect(screen.getByText('Petrobras')).toBeInTheDocument()
    expect(screen.getByText('Vale')).toBeInTheDocument()
  })
})
