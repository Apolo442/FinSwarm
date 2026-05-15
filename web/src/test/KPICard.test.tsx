import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KPICard } from '../components/stock/widgets/KPICard'

describe('KPICard', () => {
  it('renderiza label, valor e sub', () => {
    render(<KPICard label="P/L 12M" value="8,65×" sub="setor 9,1×" />)
    expect(screen.getByText('P/L 12M')).toBeInTheDocument()
    expect(screen.getByText('8,65×')).toBeInTheDocument()
    expect(screen.getByText('setor 9,1×')).toBeInTheDocument()
  })
})
