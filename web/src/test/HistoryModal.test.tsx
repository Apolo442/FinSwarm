import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HistoryModal } from '../components/HistoryModal'
import * as api from '../lib/api'
import type { AnalysisResult } from '../lib/types'

const mockResult: AnalysisResult = {
  job_id: 'job1',
  ticker: 'PETR4',
  timestamp: '2026-05-13T14:32:00',
  recommendation: 'COMPRAR',
  confidence: 0.82,
  risk_score: 31,
  stop_loss_pct: 5.0,
  agents: Object.fromEntries(
    ['technical', 'fundamental', 'sentiment', 'bull', 'bear', 'risk', 'synthesis'].map(n => [
      n, { status: 'ok' as const, summary: 'análise concluída', raw: {} },
    ])
  ) as AnalysisResult['agents'],
  elapsed_seconds: 142.0,
  cost_usd: 0.0,
}

describe('HistoryModal', () => {
  it('não renderiza nada quando jobId é null', () => {
    const { container } = render(<HistoryModal jobId={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('exibe skeleton de carregamento enquanto busca', () => {
    vi.spyOn(api, 'fetchAnalysis').mockImplementation(() => new Promise(() => {}))
    render(<HistoryModal jobId="job1" onClose={vi.fn()} />)
    expect(screen.getByText('Carregando análise...')).toBeInTheDocument()
  })

  it('renderiza o relatório quando fetch é bem-sucedido', async () => {
    vi.spyOn(api, 'fetchAnalysis').mockResolvedValue(mockResult)
    render(<HistoryModal jobId="job1" onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument()
    })
  })

  it('chama onClose ao pressionar ESC', () => {
    vi.spyOn(api, 'fetchAnalysis').mockImplementation(() => new Promise(() => {}))
    const onClose = vi.fn()
    render(<HistoryModal jobId="job1" onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('exibe mensagem de erro quando fetch falha', async () => {
    vi.spyOn(api, 'fetchAnalysis').mockRejectedValue(new Error('net'))
    render(<HistoryModal jobId="job1" onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar análise.')).toBeInTheDocument()
    })
  })
})
