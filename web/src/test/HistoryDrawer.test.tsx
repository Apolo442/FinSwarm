import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { HistoryDrawer } from '../components/HistoryDrawer'
import * as api from '../lib/api'
import type { AnalysisRow } from '../lib/types'

const mockRows: AnalysisRow[] = [
  { job_id: 'job1', ticker: 'PETR4', timestamp: '2026-05-13T14:32:00', recommendation: 'COMPRAR', confidence: 0.82, risk_score: 31 },
  { job_id: 'job2', ticker: 'VALE3', timestamp: '2026-05-12T10:00:00', recommendation: 'MANTER', confidence: 0.61, risk_score: 55 },
  { job_id: 'job3', ticker: 'ITUB4', timestamp: '2026-05-11T09:00:00', recommendation: 'VENDER', confidence: 0.74, risk_score: 77 },
]

describe('HistoryDrawer', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchAnalyses').mockResolvedValue(mockRows)
  })

  it('exibe estado vazio quando não há análises', async () => {
    vi.spyOn(api, 'fetchAnalyses').mockResolvedValue([])
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Nenhuma análise ainda')).toBeInTheDocument()
    })
  })

  it('renderiza a lista de análises', async () => {
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument()
      expect(screen.getByText('VALE3')).toBeInTheDocument()
      expect(screen.getByText('ITUB4')).toBeInTheDocument()
    })
  })

  it('filtra por recomendação ao clicar em chip', async () => {
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Comprar'))
    expect(screen.getByText('PETR4')).toBeInTheDocument()
    expect(screen.queryByText('VALE3')).not.toBeInTheDocument()
    expect(screen.queryByText('ITUB4')).not.toBeInTheDocument()
  })

  it('filtra por ticker na busca (case-insensitive)', async () => {
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar ticker...'), {
      target: { value: 'vale' },
    })
    expect(screen.queryByText('PETR4')).not.toBeInTheDocument()
    expect(screen.getByText('VALE3')).toBeInTheDocument()
  })

  it('chama onSelect com job_id ao clicar no item', async () => {
    const onSelect = vi.fn()
    render(<HistoryDrawer onSelect={onSelect} />)
    await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
    fireEvent.click(screen.getByText('PETR4').closest('button')!)
    expect(onSelect).toHaveBeenCalledWith('job1')
  })

  it('exibe erro quando fetchAnalyses rejeita', async () => {
    vi.spyOn(api, 'fetchAnalyses').mockRejectedValue(new Error('network'))
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar histórico')).toBeInTheDocument()
    })
  })

  it('renderiza logo da empresa', async () => {
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
    expect(screen.getByRole('img', { name: 'Petrobras' })).toBeInTheDocument()
  })

  it('exibe nome da empresa no item', async () => {
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
    expect(screen.getByText('Petrobras')).toBeInTheDocument()
  })
})
