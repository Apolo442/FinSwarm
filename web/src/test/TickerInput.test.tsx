import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TickerInput } from '../components/TickerInput'

describe('TickerInput', () => {
  it('chama onSubmit com ticker normalizado para uppercase + .SA', async () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} />)
    const input = screen.getByPlaceholderText('PETR4.SA')
    await userEvent.type(input, 'petr4')
    await userEvent.click(screen.getByRole('button', { name: /analisar/i }))
    expect(onSubmit).toHaveBeenCalledWith('PETR4.SA')
  })

  it('aceita ticker que já vem com .SA', async () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByPlaceholderText('PETR4.SA'), 'VALE3.SA')
    await userEvent.click(screen.getByRole('button', { name: /analisar/i }))
    expect(onSubmit).toHaveBeenCalledWith('VALE3.SA')
  })

  it('mostra erro inline e não chama onSubmit quando ticker inválido', async () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByPlaceholderText('PETR4.SA'), 'XX')
    await userEvent.click(screen.getByRole('button', { name: /analisar/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/ticker inválido/i)).toBeInTheDocument()
  })

  it('respeita prop disabled', () => {
    render(<TickerInput onSubmit={vi.fn()} disabled />)
    expect(screen.getByRole('button', { name: /analisar/i })).toBeDisabled()
  })
})
