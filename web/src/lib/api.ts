import type { JobStatus, AnalysisRow, AnalysisResult } from './types'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function postAnalyze(ticker: string): Promise<JobStatus> {
  const response = await fetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
  })
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body)
    } catch {
      /* keep statusText */
    }
    throw new ApiError(response.status, detail)
  }
  return (await response.json()) as JobStatus
}

export async function fetchAnalyses(): Promise<AnalysisRow[]> {
  const response = await fetch('/analyses')
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body)
    } catch { /* keep statusText */ }
    throw new ApiError(response.status, detail)
  }
  return response.json() as Promise<AnalysisRow[]>
}

export async function fetchAnalysis(jobId: string): Promise<AnalysisResult> {
  const response = await fetch(`/analyses/${jobId}`)
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body)
    } catch { /* keep statusText */ }
    throw new ApiError(response.status, detail)
  }
  return response.json() as Promise<AnalysisResult>
}
