import { useEffect, useRef, useState } from 'react'

type TabName = 'overview' | 'financials' | 'news' | 'technicals' | 'forecast' | 'seasonals'

const sessionCache: Map<string, unknown> = new Map()

export function useStockData<T>(
  ticker: string,
  tab: TabName,
  fetcher: (t: string) => Promise<T>,
  enabled: boolean = true,
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const base = ticker.toUpperCase().replace(/\.SA$/i, '')
    const key = `${base}:${tab}`
    const cached = sessionCache.get(key) as T | undefined
    if (cached) { setData(cached); return }
    const id = ++reqId.current
    setLoading(true); setError(null)
    fetcher(base)
      .then(d => {
        if (id !== reqId.current) return
        sessionCache.set(key, d)
        setData(d)
      })
      .catch(e => { if (id === reqId.current) setError(e.message) })
      .finally(() => { if (id === reqId.current) setLoading(false) })
  }, [ticker, tab, enabled])

  return { data, loading, error }
}

export function invalidateStockCache(ticker: string, tab?: TabName) {
  const base = ticker.toUpperCase().replace(/\.SA$/i, '')
  if (tab) sessionCache.delete(`${base}:${tab}`)
  else for (const k of Array.from(sessionCache.keys())) {
    if (k.startsWith(`${base}:`)) sessionCache.delete(k)
  }
}
