import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// jsdom does not implement ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}

vi.mock('lightweight-charts', () => ({
  createChart: () => ({
    addAreaSeries: () => ({ setData: vi.fn(), applyOptions: vi.fn() }),
    timeScale: () => ({ fitContent: vi.fn() }),
    applyOptions: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn(),
  }),
}))
