import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesOptions,
  type AreaSeriesOptions,
} from 'lightweight-charts'
import { fetchChart, type OhlcvBar } from '../lib/api'

type Period   = '1mo' | '3mo' | '6mo' | '1y'
type ChartType = 'area' | 'candle'

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
  const seriesRef    = useRef<ISeriesApi<'Area'> | ISeriesApi<'Candlestick'> | null>(null)
  const barsRef      = useRef<OhlcvBar[]>([])

  const [period,    setPeriod]    = useState<Period>('3mo')
  const [chartType, setChartType] = useState<ChartType>('area')
  const [loading,   setLoading]   = useState(true)

  // Cria e destrói o chart quando height muda
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
      timeScale:       { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: { mouseWheel: false },
      handleScale:  { mouseWheel: false },
    })
    chartRef.current = chart

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.resize(Math.max(containerRef.current.offsetWidth, 100), height)
    })
    ro.observe(containerRef.current)
    requestAnimationFrame(() => {
      if (containerRef.current)
        chart.resize(Math.max(containerRef.current.offsetWidth, 100), height)
    })
    return () => { ro.disconnect(); chart.remove() }
  }, [height])

  // Recria a série quando chartType muda (mantém os dados)
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // remove série anterior
    if (seriesRef.current) {
      try { chart.removeSeries(seriesRef.current) } catch {}
      seriesRef.current = null
    }

    if (chartType === 'candle') {
      const s = chart.addCandlestickSeries({
        upColor:          '#4ebe96',
        downColor:        '#e05454',
        borderUpColor:    '#4ebe96',
        borderDownColor:  '#e05454',
        wickUpColor:      '#4ebe96',
        wickDownColor:    '#e05454',
      } as Partial<CandlestickSeriesOptions>)
      seriesRef.current = s as any
      if (barsRef.current.length) {
        s.setData(barsRef.current.map(b => ({
          time:  b.time as any,
          open:  b.open,
          high:  b.high,
          low:   b.low,
          close: b.close,
        })))
        chart.timeScale().fitContent()
      }
    } else {
      const s = chart.addAreaSeries({
        lineColor:      '#479ffa',
        topColor:       'rgba(71,159,250,0.18)',
        bottomColor:    'rgba(71,159,250,0.00)',
        lineWidth:      2,
        priceLineColor: 'rgba(71,159,250,0.3)',
        priceLineStyle: 2,
      } as Partial<AreaSeriesOptions>)
      seriesRef.current = s as any
      if (barsRef.current.length) {
        s.setData(barsRef.current.map(b => ({ time: b.time as any, value: b.close })))
        chart.timeScale().fitContent()
      }
    }
  }, [chartType])

  // Busca dados quando ticker ou período muda
  useEffect(() => {
    setLoading(true)
    fetchChart(ticker, period)
      .then((bars: OhlcvBar[]) => {
        barsRef.current = bars
        const s = seriesRef.current
        if (!s) return
        if (chartType === 'candle') {
          ;(s as ISeriesApi<'Candlestick'>).setData(
            bars.map(b => ({ time: b.time as any, open: b.open, high: b.high, low: b.low, close: b.close }))
          )
        } else {
          ;(s as ISeriesApi<'Area'>).setData(
            bars.map(b => ({ time: b.time as any, value: b.close }))
          )
        }
        chartRef.current?.timeScale().fitContent()
      })
      .finally(() => setLoading(false))
  }, [ticker, period])

  const btnBase: React.CSSProperties = {
    fontFamily: 'monospace', fontSize: 10, padding: '3px 10px',
    borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s',
  }

  return (
    <div>
      {/* Controles: períodos + tipo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px 0', flexWrap: 'wrap', gap: 6 }}>
        {/* Períodos */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} style={{
              ...btnBase,
              border: `1px solid ${period === p.value ? 'rgba(71,159,250,0.4)' : 'rgba(255,255,255,0.1)'}`,
              background: period === p.value ? 'rgba(71,159,250,0.08)' : 'transparent',
              color: period === p.value ? '#479ffa' : '#868f97',
            }}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Tipo de gráfico */}
        <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: 3 }}>
          {(['area', 'candle'] as ChartType[]).map(t => (
            <button key={t} onClick={() => setChartType(t)} style={{
              ...btnBase, padding: '2px 10px',
              border: 'none',
              background: chartType === t ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: chartType === t ? '#e6e6e6' : '#868f97',
              borderRadius: 999,
            }}>
              {t === 'area' ? 'Linha' : 'Candle'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 12px 10px', position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(19,19,19,0.6)', zIndex: 1,
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}
              className="animate-pulse-blue">carregando...</span>
          </div>
        )}
        <div ref={containerRef} style={{
          height, borderRadius: 8, overflow: 'hidden',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
        }} />
      </div>
    </div>
  )
}
