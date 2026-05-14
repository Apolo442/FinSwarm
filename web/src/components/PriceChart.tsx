import { useEffect, useRef, useState } from 'react'
import { createChart, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { fetchChart, type OhlcvBar } from '../lib/api'

type Period = '1mo' | '3mo' | '6mo' | '1y'
const PERIODS: { label: string; value: Period }[] = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y'  },
]

interface PriceChartProps {
  ticker: string
  height?: number
}

export function PriceChart({ ticker, height = 180 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Area'> | null>(null)
  const [period, setPeriod]   = useState<Period>('3mo')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      width:  Math.max(containerRef.current.offsetWidth, 100),
      height,
      layout: {
        background: { type: 'solid' as any, color: 'transparent' },
        textColor: '#868f97',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(71,159,250,0.4)', labelBackgroundColor: '#479ffa' },
        horzLine: { color: 'rgba(71,159,250,0.4)', labelBackgroundColor: '#479ffa' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      timeScale:       { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true },
      handleScroll: { mouseWheel: false },
      handleScale:  { mouseWheel: false },
    })
    const series = chart.addAreaSeries({
      lineColor:      '#479ffa',
      topColor:       'rgba(71,159,250,0.18)',
      bottomColor:    'rgba(71,159,250,0.00)',
      lineWidth:      2,
      priceLineColor: 'rgba(71,159,250,0.3)',
      priceLineStyle: 2,
    })
    chartRef.current  = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.resize(Math.max(containerRef.current.offsetWidth, 100), height)
    })
    ro.observe(containerRef.current)
    // force resize on next frame in case container was zero-width at mount (e.g. inside modal)
    requestAnimationFrame(() => {
      if (containerRef.current)
        chart.resize(Math.max(containerRef.current.offsetWidth, 100), height)
    })
    return () => { ro.disconnect(); chart.remove() }
  }, [height])

  useEffect(() => {
    setLoading(true)
    fetchChart(ticker, period)
      .then((bars: OhlcvBar[]) => {
        seriesRef.current?.setData(
          bars.map(b => ({ time: b.time as any, value: b.close }))
        )
        chartRef.current?.timeScale().fitContent()
      })
      .finally(() => setLoading(false))
  }, [ticker, period])

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px 0' }}>
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
              padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${period === p.value ? 'rgba(71,159,250,0.4)' : 'rgba(255,255,255,0.1)'}`,
              background: period === p.value ? 'rgba(71,159,250,0.08)' : 'transparent',
              color: period === p.value ? '#479ffa' : '#868f97',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '8px 12px 10px', position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(19,19,19,0.6)',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}
              className="animate-pulse-blue">carregando...</span>
          </div>
        )}
        <div
          ref={containerRef}
          style={{ height, borderRadius: 8, overflow: 'hidden',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        />
      </div>
    </div>
  )
}
