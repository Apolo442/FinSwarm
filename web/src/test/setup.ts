import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// jsdom does not implement ResizeObserver
;(globalThis as any).ResizeObserver = class ResizeObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}

// Mock fetch for /chart/* routes so tests that render PriceChart don't hit the network
const _originalFetch = (globalThis as any).fetch as typeof fetch
;(globalThis as any).fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
  if (url.includes('/chart/')) return Promise.resolve(new Response('[]', { status: 200 }))
  return _originalFetch(input, init)
}) as typeof fetch

vi.mock('lightweight-charts', () => ({
  createChart: () => ({
    addAreaSeries: () => ({ setData: vi.fn(), applyOptions: vi.fn() }),
    timeScale: () => ({ fitContent: vi.fn() }),
    applyOptions: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn(),
  }),
}))
