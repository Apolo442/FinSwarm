# FinSwarm Visual Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign visual completo: nova paleta, blobs, quick picks B3, logos no histórico, relatório Magazine com gráfico interativo real (TradingView) e bento grid de agentes com visuais específicos por tipo.

**Architecture:** CSS tokens substituídos em `index.css`; novos componentes `PriceChart`, `StockQuickPicks`, `AgentBento` criados com responsabilidade única; componentes existentes `ReportHero` e `HistoryDrawer` refatorados; backend ganha endpoint `GET /chart/{ticker}` via yfinance.

**Tech Stack:** React 18, TypeScript, Tailwind v4, Vitest + RTL, `lightweight-charts` v4 (TradingView), yfinance (já instalado), FastAPI.

---

## File Map

| Arquivo | Operação | Responsabilidade |
|---|---|---|
| `web/src/index.css` | Modificar | Tokens de cor, glass, animações |
| `web/src/App.tsx` | Modificar | Cores dos blobs |
| `web/src/lib/companyMeta.ts` | Criar | Mapa ticker → nome + iniciais |
| `web/src/lib/api.ts` | Modificar | Adicionar `fetchChart` |
| `web/src/components/PriceChart.tsx` | Criar | Gráfico TradingView área+linha |
| `web/src/components/StockQuickPicks.tsx` | Criar | Grid 5×2 quick picks |
| `web/src/components/HistoryDrawer.tsx` | Modificar | Logos + barra de confiança |
| `web/src/components/ReportHero.tsx` | Modificar | Layout Magazine |
| `web/src/components/AgentBento.tsx` | Criar | Bento grid 7 agentes |
| `web/src/components/AgentSlot.tsx` | Modificar | Atualizar cores para nova paleta |
| `web/src/pages/Home.tsx` | Modificar | Adicionar StockQuickPicks |
| `web/src/pages/Analysis.tsx` | Modificar | AgentBento no resultado |
| `web/src/components/HistoryModal.tsx` | Modificar | AgentBento em vez de AgentSlot |
| `web/src/test/companyMeta.test.ts` | Criar | Testes do mapa |
| `web/src/test/PriceChart.test.tsx` | Criar | Testes do chart |
| `web/src/test/StockQuickPicks.test.tsx` | Criar | Testes do grid |
| `web/src/test/HistoryDrawer.test.tsx` | Modificar | Atualizar para novo layout |
| `web/src/test/ReportHero.test.tsx` | Modificar | Atualizar para novo layout |
| `web/src/test/AgentBento.test.tsx` | Criar | Testes do bento |
| `web/vite.config.ts` | Modificar | Proxy `/chart` |
| `web/package.json` | Modificar | Adicionar `lightweight-charts` |
| `src/api.py` | Modificar | Endpoint `GET /chart/{ticker}` |
| `src/agents/fundamental.py` | Modificar | Incluir valores numéricos no raw |
| `tests/test_chart_endpoint.py` | Criar | Teste do endpoint |

---

## Task 1: Instalar dependência e configurar proxy

**Files:**
- Modify: `web/package.json`
- Modify: `web/vite.config.ts`

- [ ] **Step 1: Instalar lightweight-charts**

```bash
cd /home/mateus/finswarm/web && npm install lightweight-charts@4.1.3
```

Expected: `"lightweight-charts": "^4.1.3"` em `dependencies`.

- [ ] **Step 2: Adicionar proxy `/chart` no vite.config.ts**

```ts
proxy: {
  '/analyze':  'http://localhost:8000',
  '/analyses': 'http://localhost:8000',
  '/health':   'http://localhost:8000',
  '/chart':    'http://localhost:8000',
  '/ws': {
    target: 'ws://localhost:8000',
    ws: true,
    changeOrigin: true,
    rewriteWsOrigin: true,
  },
},
```

- [ ] **Step 3: Verificar build**

```bash
cd /home/mateus/finswarm/web && npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 4: Commit**

```bash
cd /home/mateus/finswarm && git add web/package.json web/package-lock.json web/vite.config.ts
git commit -m "chore: add lightweight-charts, proxy /chart"
```

---

## Task 2: `companyMeta.ts` — mapa de empresas

**Files:**
- Create: `web/src/lib/companyMeta.ts`
- Create: `web/src/test/companyMeta.test.ts`

- [ ] **Step 1: Escrever teste**

```ts
// web/src/test/companyMeta.test.ts
import { describe, it, expect } from 'vitest'
import { getCompanyMeta } from '../lib/companyMeta'

describe('getCompanyMeta', () => {
  it('retorna meta para ticker conhecido sem sufixo', () => {
    const m = getCompanyMeta('PETR4')
    expect(m.name).toBe('Petrobras')
    expect(m.initials).toBe('PB')
  })

  it('retorna meta para ticker com sufixo .SA', () => {
    const m = getCompanyMeta('VALE3.SA')
    expect(m.name).toBe('Vale')
    expect(m.initials).toBe('VA')
  })

  it('fallback para ticker desconhecido: iniciais = 2 primeiras letras', () => {
    const m = getCompanyMeta('XPTO3')
    expect(m.initials).toBe('XP')
    expect(m.name).toBe('XPTO3')
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
cd /home/mateus/finswarm/web && npm run test -- companyMeta 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../lib/companyMeta'`

- [ ] **Step 3: Implementar**

```ts
// web/src/lib/companyMeta.ts
interface CompanyMeta { name: string; initials: string }

const META: Record<string, CompanyMeta> = {
  PETR4: { name: 'Petrobras',       initials: 'PB' },
  VALE3: { name: 'Vale',            initials: 'VA' },
  ITUB4: { name: 'Itaú',            initials: 'IT' },
  BBDC4: { name: 'Bradesco',        initials: 'BD' },
  ABEV3: { name: 'Ambev',           initials: 'AB' },
  WEGE3: { name: 'WEG',             initials: 'WG' },
  B3SA3: { name: 'B3',              initials: 'B3' },
  BBAS3: { name: 'Banco do Brasil', initials: 'BN' },
  MGLU3: { name: 'Magalu',          initials: 'MG' },
  RENT3: { name: 'Localiza',        initials: 'LC' },
}

export function getCompanyMeta(ticker: string): CompanyMeta {
  const base = ticker.replace(/\.SA$/i, '').toUpperCase()
  return META[base] ?? { name: base, initials: base.slice(0, 2) }
}
```

- [ ] **Step 4: Rodar e confirmar pass**

```bash
cd /home/mateus/finswarm/web && npm run test -- companyMeta 2>&1 | tail -5
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
cd /home/mateus/finswarm && git add web/src/lib/companyMeta.ts web/src/test/companyMeta.test.ts
git commit -m "feat: add companyMeta utility"
```

---

## Task 3: Nova paleta CSS + blobs

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Substituir tokens em `index.css`**

Substituir o bloco `@theme { ... }` e a classe `.glass` / `.glass-blue` por:

```css
@import "tailwindcss";

@theme {
  --color-bg:           #131313;
  --color-surface:      #1a1a1a;
  --color-surface-alt:  #1f1f1f;
  --color-border:       rgba(255,255,255,0.09);
  --color-border-sub:   rgba(255,255,255,0.06);

  --color-brand-solar:  #ffa16c;
  --color-accent:       #479ffa;
  --color-positive:     #4ebe96;
  --color-warn:         #e9a84a;
  --color-negative:     #e05454;

  --color-text-primary: #ffffff;
  --color-text-smoke:   #e6e6e6;
  --color-text-silver:  #cccccc;
  --color-text-ash:     #999999;
  --color-text-slate:   #868f97;

  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono:  'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}

html, body, #root { height: 100%; }

body {
  margin: 0;
  background-color: #131313;
  color: #ffffff;
  font-family: var(--font-inter);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ── Glass ──────────────────────────────── */
.glass {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.09);
}
.glass-inner {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.07);
}
.glass-accent {
  background: rgba(71,159,250,0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(71,159,250,0.18);
}

/* ── Animations ─────────────────────────── */
@keyframes pulse-blue {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(71,159,250,0.5); }
  50%       { opacity: 0.8; box-shadow: 0 0 0 6px rgba(71,159,250,0); }
}
.animate-pulse-blue { animation: pulse-blue 1.6s ease-in-out infinite; }

@keyframes shimmer {
  0%   { transform: translateX(-100%) skewX(-12deg); }
  100% { transform: translateX(350%) skewX(-12deg); }
}
.animate-shimmer { animation: shimmer 2.2s linear infinite; }

@keyframes bar-fill {
  from { width: 0; }
}
.animate-bar-fill { animation: bar-fill 0.9s cubic-bezier(0.22,1,0.36,1) both; }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up { animation: fade-up 0.4s ease both; }
```

- [ ] **Step 2: Atualizar cores dos blobs em `App.tsx`**

```tsx
function GradientBackground() {
  return (
    <div aria-hidden style={{ position:'fixed', inset:0, zIndex:-1, overflow:'hidden', pointerEvents:'none' }}>
      {/* Blob top-left — Solar Flare #ffa16c */}
      <div style={{
        position:'absolute', top:'-18%', left:'-12%', width:'72vw', height:'72vw',
        borderRadius:'62% 38% 54% 46% / 48% 57% 43% 52%',
        background:'radial-gradient(ellipse at 35% 38%, rgba(255,161,108,0.22) 0%, rgba(255,161,108,0.06) 45%, transparent 70%)',
        filter:'blur(72px)',
      }} />
      {/* Blob bottom-right — Slate #868f97 */}
      <div style={{
        position:'absolute', bottom:'-22%', right:'-8%', width:'68vw', height:'68vw',
        borderRadius:'44% 56% 38% 62% / 57% 38% 62% 43%',
        background:'radial-gradient(ellipse at 65% 62%, rgba(134,143,151,0.20) 0%, rgba(134,143,151,0.05) 45%, transparent 70%)',
        filter:'blur(90px)',
      }} />
      {/* Blob accent center-right */}
      <div style={{
        position:'absolute', top:'38%', right:'8%', width:'28vw', height:'28vw',
        borderRadius:'52% 48% 61% 39% / 46% 55% 45% 54%',
        background:'radial-gradient(ellipse at 50% 50%, rgba(255,161,108,0.08) 0%, transparent 65%)',
        filter:'blur(60px)',
      }} />
    </div>
  )
}
```

- [ ] **Step 3: Rodar testes para garantir nenhuma quebra de CSS**

```bash
cd /home/mateus/finswarm/web && npm run test 2>&1 | tail -10
```

Expected: todos os testes existentes passam (31 testes).

- [ ] **Step 4: Commit**

```bash
cd /home/mateus/finswarm && git add web/src/index.css web/src/App.tsx
git commit -m "feat: apply new color palette and blob colors"
```

---

## Task 4: Backend — endpoint `GET /chart/{ticker}`

**Files:**
- Modify: `src/api.py`
- Create: `tests/test_chart_endpoint.py`

- [ ] **Step 1: Escrever teste**

```python
# tests/test_chart_endpoint.py
import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from fastapi.testclient import TestClient
from src.api import app

client = TestClient(app)

def _mock_hist():
    idx = pd.to_datetime(['2026-01-02', '2026-01-03'])
    df = pd.DataFrame({
        'Open':   [35.0, 36.0],
        'High':   [36.5, 37.0],
        'Low':    [34.5, 35.5],
        'Close':  [36.0, 36.8],
        'Volume': [1000000, 1200000],
    }, index=idx)
    df.index.name = 'Date'
    return df

def test_chart_returns_ohlcv():
    mock_ticker = MagicMock()
    mock_ticker.history.return_value = _mock_hist()
    with patch('src.api.yf.Ticker', return_value=mock_ticker):
        r = client.get('/chart/PETR4.SA?period=1mo&interval=1d')
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert set(data[0].keys()) == {'time', 'open', 'high', 'low', 'close', 'volume'}
    assert data[0]['close'] == 36.0

def test_chart_default_params():
    mock_ticker = MagicMock()
    mock_ticker.history.return_value = _mock_hist()
    with patch('src.api.yf.Ticker', return_value=mock_ticker):
        r = client.get('/chart/PETR4.SA')
    mock_ticker.history.assert_called_once_with(period='3mo', interval='1d')
    assert r.status_code == 200
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
cd /home/mateus/finswarm && poetry run pytest tests/test_chart_endpoint.py -v 2>&1 | tail -10
```

Expected: FAIL — `404 Not Found`

- [ ] **Step 3: Adicionar endpoint em `src/api.py`**

Adicionar import no topo (se não existir): `import yfinance as yf`

Adicionar rota após as rotas existentes:

```python
@app.get("/chart/{ticker}")
async def get_chart(ticker: str, period: str = "3mo", interval: str = "1d"):
    t = yf.Ticker(ticker)
    hist = t.history(period=period, interval=interval)
    result = []
    for ts, row in hist.iterrows():
        result.append({
            "time":   int(ts.timestamp()),
            "open":   round(float(row["Open"]),   2),
            "high":   round(float(row["High"]),   2),
            "low":    round(float(row["Low"]),    2),
            "close":  round(float(row["Close"]),  2),
            "volume": int(row["Volume"]),
        })
    return result
```

- [ ] **Step 4: Rodar e confirmar pass**

```bash
cd /home/mateus/finswarm && poetry run pytest tests/test_chart_endpoint.py -v 2>&1 | tail -8
```

Expected: `2 passed`

- [ ] **Step 5: Rodar todos os testes backend**

```bash
cd /home/mateus/finswarm && poetry run pytest --timeout=30 -q 2>&1 | tail -5
```

Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
cd /home/mateus/finswarm && git add src/api.py tests/test_chart_endpoint.py
git commit -m "feat: add GET /chart/{ticker} endpoint (yfinance OHLCV)"
```

---

## Task 5: `fetchChart` em `api.ts`

**Files:**
- Modify: `web/src/lib/api.ts`

- [ ] **Step 1: Adicionar tipo e função ao final de `api.ts`**

```ts
export interface OhlcvBar {
  time:   number
  open:   number
  high:   number
  low:    number
  close:  number
  volume: number
}

export async function fetchChart(
  ticker: string,
  period: '1mo' | '3mo' | '6mo' | '1y' = '3mo',
): Promise<OhlcvBar[]> {
  const r = await fetch(`/chart/${encodeURIComponent(ticker)}?period=${period}&interval=1d`)
  if (!r.ok) throw new Error(`chart ${r.status}`)
  return r.json()
}
```

- [ ] **Step 2: Verificar build TypeScript**

```bash
cd /home/mateus/finswarm/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd /home/mateus/finswarm && git add web/src/lib/api.ts
git commit -m "feat: add fetchChart to api.ts"
```

---

## Task 6: Componente `PriceChart`

**Files:**
- Create: `web/src/components/PriceChart.tsx`
- Create: `web/src/test/PriceChart.test.tsx`

- [ ] **Step 1: Mock de `lightweight-charts` no setup de testes**

Adicionar ao final de `web/src/test/setup.ts`:

```ts
vi.mock('lightweight-charts', () => ({
  createChart: () => ({
    addAreaSeries: () => ({ setData: vi.fn(), applyOptions: vi.fn() }),
    timeScale: () => ({ fitContent: vi.fn() }),
    applyOptions: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn(),
  }),
}))
```

- [ ] **Step 2: Escrever testes**

```tsx
// web/src/test/PriceChart.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PriceChart } from '../components/PriceChart'
import * as api from '../lib/api'

const mockBars = [
  { time: 1700000000, open: 35, high: 37, low: 34, close: 36, volume: 1000000 },
  { time: 1700086400, open: 36, high: 38, low: 35, close: 37, volume: 1200000 },
]

describe('PriceChart', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchChart').mockResolvedValue(mockBars)
  })

  it('chama fetchChart com ticker e period padrão', async () => {
    render(<PriceChart ticker="PETR4.SA" />)
    await waitFor(() => expect(api.fetchChart).toHaveBeenCalledWith('PETR4.SA', '3mo'))
  })

  it('renderiza botões de período', async () => {
    render(<PriceChart ticker="PETR4.SA" />)
    await waitFor(() => expect(api.fetchChart).toHaveBeenCalled())
    expect(screen.getByText('1M')).toBeInTheDocument()
    expect(screen.getByText('3M')).toBeInTheDocument()
    expect(screen.getByText('6M')).toBeInTheDocument()
    expect(screen.getByText('1A')).toBeInTheDocument()
  })

  it('re-fetcha ao trocar período', async () => {
    render(<PriceChart ticker="PETR4.SA" />)
    await waitFor(() => expect(api.fetchChart).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByText('6M'))
    await waitFor(() => expect(api.fetchChart).toHaveBeenCalledWith('PETR4.SA', '6mo'))
  })
})
```

- [ ] **Step 3: Rodar e confirmar falha**

```bash
cd /home/mateus/finswarm/web && npm run test -- PriceChart 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../components/PriceChart'`

- [ ] **Step 4: Implementar `PriceChart.tsx`**

```tsx
// web/src/components/PriceChart.tsx
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

  // Inicializar chart uma vez
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.offsetWidth,
      height,
      layout: {
        background: { type: 'solid' as const, color: 'transparent' },
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
      lineColor:   '#479ffa',
      topColor:    'rgba(71,159,250,0.18)',
      bottomColor: 'rgba(71,159,250,0.00)',
      lineWidth:   2,
      priceLineColor: 'rgba(71,159,250,0.3)',
      priceLineStyle: 2,
    })
    chartRef.current  = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.resize(containerRef.current.offsetWidth, height)
    })
    ro.observe(containerRef.current)
    return () => { ro.disconnect(); chart.remove() }
  }, [height])

  // Buscar dados ao trocar ticker/período
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
      {/* Range pills */}
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
      {/* Chart container */}
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
```

- [ ] **Step 5: Rodar e confirmar pass**

```bash
cd /home/mateus/finswarm/web && npm run test -- PriceChart 2>&1 | tail -5
```

Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
cd /home/mateus/finswarm && git add web/src/components/PriceChart.tsx web/src/test/PriceChart.test.tsx web/src/test/setup.ts
git commit -m "feat: add PriceChart component (TradingView lightweight-charts)"
```

---

## Task 7: `StockQuickPicks` — grid 5×2

**Files:**
- Create: `web/src/components/StockQuickPicks.tsx`
- Create: `web/src/test/StockQuickPicks.test.tsx`

- [ ] **Step 1: Escrever testes**

```tsx
// web/src/test/StockQuickPicks.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StockQuickPicks } from '../components/StockQuickPicks'

describe('StockQuickPicks', () => {
  it('renderiza os 10 tickers', () => {
    render(<StockQuickPicks onSelect={vi.fn()} />)
    const tickers = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','B3SA3','BBAS3','MGLU3','RENT3']
    tickers.forEach(t => expect(screen.getByText(t)).toBeInTheDocument())
  })

  it('chama onSelect com ticker.SA ao clicar', () => {
    const onSelect = vi.fn()
    render(<StockQuickPicks onSelect={onSelect} />)
    fireEvent.click(screen.getByText('PETR4').closest('button')!)
    expect(onSelect).toHaveBeenCalledWith('PETR4.SA')
  })

  it('renderiza nomes de empresa', () => {
    render(<StockQuickPicks onSelect={vi.fn()} />)
    expect(screen.getByText('Petrobras')).toBeInTheDocument()
    expect(screen.getByText('Vale')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
cd /home/mateus/finswarm/web && npm run test -- StockQuickPicks 2>&1 | tail -5
```

- [ ] **Step 3: Implementar**

```tsx
// web/src/components/StockQuickPicks.tsx
import { getCompanyMeta } from '../lib/companyMeta'

const TICKERS = ['PETR4','VALE3','ITUB4','BBDC4','ABEV3','WEGE3','B3SA3','BBAS3','MGLU3','RENT3']

interface StockQuickPicksProps {
  onSelect: (ticker: string) => void
  disabled?: boolean
}

export function StockQuickPicks({ onSelect, disabled = false }: StockQuickPicksProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#868f97' }}>
        Principais da B3
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {TICKERS.map(ticker => {
          const meta = getCompanyMeta(ticker)
          return (
            <button
              key={ticker}
              onClick={() => onSelect(`${ticker}.SA`)}
              disabled={disabled}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '10px 6px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!disabled) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(134,143,151,0.4)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(134,143,151,0.07)'
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
            >
              {/* Logo */}
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
                color: '#479ffa',
                background: 'rgba(71,159,250,0.08)',
                border: '1px solid rgba(71,159,250,0.16)',
              }}>
                {meta.initials}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace', color: '#fff' }}>
                {ticker}
              </span>
              <span style={{ fontSize: 7, color: '#868f97', textAlign: 'center', lineHeight: 1.3 }}>
                {meta.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar e confirmar pass**

```bash
cd /home/mateus/finswarm/web && npm run test -- StockQuickPicks 2>&1 | tail -5
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
cd /home/mateus/finswarm && git add web/src/components/StockQuickPicks.tsx web/src/test/StockQuickPicks.test.tsx
git commit -m "feat: add StockQuickPicks component (10 B3 stocks grid)"
```

---

## Task 8: `HistoryDrawer` — logos + barra de confiança

**Files:**
- Modify: `web/src/components/HistoryDrawer.tsx`
- Modify: `web/src/test/HistoryDrawer.test.tsx`

- [ ] **Step 1: Atualizar testes existentes**

Os testes existentes já passam. Adicionar apenas 2 novos testes ao final do `describe`:

```tsx
it('renderiza logo com iniciais da empresa', async () => {
  render(<HistoryDrawer onSelect={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
  expect(screen.getByText('PB')).toBeInTheDocument() // iniciais Petrobras
})

it('exibe nome da empresa no item', async () => {
  render(<HistoryDrawer onSelect={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
  expect(screen.getByText('Petrobras')).toBeInTheDocument()
})
```

- [ ] **Step 2: Atualizar `HistoryDrawer.tsx`**

Adicionar import no topo:
```tsx
import { getCompanyMeta } from '../lib/companyMeta'
```

Substituir o bloco `{filtered.map(row => (` pelo novo layout:

```tsx
{filtered.map(row => {
  const meta = getCompanyMeta(row.ticker)
  return (
    <button
      key={row.job_id}
      onClick={() => onSelect(row.job_id)}
      className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg glass-inner transition-all"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(134,143,151,0.35)' }}
      onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.07)' }}
    >
      {/* Logo */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
        color: '#479ffa', background: 'rgba(71,159,250,0.08)',
        border: '1px solid rgba(71,159,250,0.16)',
      }}>
        {meta.initials}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Linha superior */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12px] font-bold" style={{ color: '#479ffa' }}>
            {row.ticker}
          </span>
          <span className="font-mono text-[9px]" style={{ color: '#868f97' }}>
            {meta.name}
          </span>
          <span className={`font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full border ml-1 ${REC_CHIP[row.recommendation]}`}>
            {REC_LABEL[row.recommendation]}
          </span>
          <span className="font-mono text-[10px] ml-auto whitespace-nowrap" style={{ color: '#868f97' }}>
            {formatDate(row.timestamp)}
          </span>
        </div>
        {/* Linha inferior: barra de confiança */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="font-mono text-[8px]" style={{ color: '#999999', minWidth: 28 }}>
            {Math.round(row.confidence * 100)}%
          </span>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 1,
              width: `${Math.round(row.confidence * 100)}%`,
              background: row.recommendation === 'COMPRAR' ? '#4ebe96'
                        : row.recommendation === 'MANTER'  ? '#e9a84a' : '#e05454',
            }} />
          </div>
        </div>
      </div>
    </button>
  )
})}
```

Atualizar também `REC_CHIP` para nova paleta:
```tsx
const REC_CHIP: Record<Recommendation, string> = {
  COMPRAR: 'border-[rgba(78,190,150,0.22)] text-[#4ebe96] bg-[rgba(78,190,150,0.1)]',
  MANTER:  'border-[rgba(233,168,74,0.2)]  text-[#e9a84a] bg-[rgba(233,168,74,0.1)]',
  VENDER:  'border-[rgba(224,84,84,0.2)]   text-[#e05454] bg-[rgba(224,84,84,0.1)]',
}
```

- [ ] **Step 3: Rodar testes**

```bash
cd /home/mateus/finswarm/web && npm run test -- HistoryDrawer 2>&1 | tail -8
```

Expected: `8 passed` (6 originais + 2 novos)

- [ ] **Step 4: Commit**

```bash
cd /home/mateus/finswarm && git add web/src/components/HistoryDrawer.tsx web/src/test/HistoryDrawer.test.tsx
git commit -m "feat: update HistoryDrawer with company logos and confidence bar"
```

---

## Task 9: `ReportHero` — layout Magazine

**Files:**
- Modify: `web/src/components/ReportHero.tsx`
- Modify: `web/src/test/ReportHero.test.tsx`

- [ ] **Step 1: Atualizar testes para novo layout**

```tsx
// web/src/test/ReportHero.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportHero } from '../components/ReportHero'
import type { AnalysisResult } from '../lib/types'

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    job_id: 'abc', ticker: 'PETR4.SA', timestamp: '2026-05-12T12:00:00Z',
    recommendation: 'COMPRAR', confidence: 0.78, risk_score: 42,
    stop_loss_pct: 5.2, agents: {} as AnalysisResult['agents'],
    elapsed_seconds: 54, cost_usd: 0, ...overrides,
  }
}

describe('ReportHero', () => {
  it('mostra recomendação em Solar Flare', () => {
    render(<ReportHero result={makeResult()} />)
    const el = screen.getByTestId('recommendation')
    expect(el).toHaveTextContent('COMPRAR')
    expect(el).toHaveStyle({ color: '#ffa16c' })
  })

  it('mostra ticker e confiança', () => {
    render(<ReportHero result={makeResult()} />)
    expect(screen.getByText(/PETR4\.SA/)).toBeInTheDocument()
    expect(screen.getByText(/78%/)).toBeInTheDocument()
  })

  it('mostra risco', () => {
    render(<ReportHero result={makeResult()} />)
    expect(screen.getByText(/risco 42/i)).toBeInTheDocument()
  })

  it('renderiza PriceChart', () => {
    render(<ReportHero result={makeResult()} />)
    // PriceChart renderiza os botões de período
    expect(screen.getByText('3M')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha (testes antigos quebram)**

```bash
cd /home/mateus/finswarm/web && npm run test -- ReportHero 2>&1 | tail -10
```

- [ ] **Step 3: Reescrever `ReportHero.tsx`**

```tsx
// web/src/components/ReportHero.tsx
import type { AnalysisResult, Recommendation } from '../lib/types'
import { PriceChart } from './PriceChart'

interface ReportHeroProps { result: AnalysisResult }

const CONF_BADGE: Record<Recommendation, string> = {
  COMPRAR: 'rgba(78,190,150,0.1)',
  MANTER:  'rgba(233,168,74,0.1)',
  VENDER:  'rgba(224,84,84,0.1)',
}
const CONF_BORDER: Record<Recommendation, string> = {
  COMPRAR: 'rgba(78,190,150,0.22)',
  MANTER:  'rgba(233,168,74,0.2)',
  VENDER:  'rgba(224,84,84,0.2)',
}
const CONF_COLOR: Record<Recommendation, string> = {
  COMPRAR: '#4ebe96',
  MANTER:  '#e9a84a',
  VENDER:  '#e05454',
}

export function ReportHero({ result }: ReportHeroProps) {
  const confPct  = Math.round(result.confidence * 100)
  const riskWarn = result.risk_score >= 65 ? '#e05454' : '#e9a84a'
  const rec      = result.recommendation

  return (
    <section className="glass rounded-xl overflow-hidden animate-fade-up">
      {/* Top: rec + badges */}
      <div style={{ padding: '14px 16px 12px', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div data-testid="recommendation" style={{
            fontSize: 30, fontWeight: 700, lineHeight: 1, color: '#ffa16c',
          }}>
            {rec}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97',
            marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {result.ticker}
            {' · '}
            {new Date(result.timestamp).toLocaleDateString('pt-BR')}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 9, padding: '3px 9px', borderRadius: 999,
            background: CONF_BADGE[rec], border: `1px solid ${CONF_BORDER[rec]}`,
            color: CONF_COLOR[rec], fontWeight: 600,
          }}>
            {confPct}% confiança
          </span>
          <span style={{
            fontFamily: 'monospace', fontSize: 9, padding: '3px 9px', borderRadius: 999,
            background: 'rgba(233,168,74,0.1)', border: '1px solid rgba(233,168,74,0.2)',
            color: riskWarn, fontWeight: 600,
          }}>
            risco {result.risk_score}
          </span>
        </div>
      </div>

      {/* Gráfico interativo */}
      <PriceChart ticker={result.ticker} height={160} />

      {/* Métricas inline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, padding: '0 12px 12px' }}>
        {[
          { label: 'Variação 20d',  value: result.ticker,     display: '—'     },
          { label: 'Confiança',     value: `${confPct}%`,     display: `${confPct}%`, color: CONF_COLOR[rec] },
          { label: 'Stop Loss',     value: `${result.stop_loss_pct.toFixed(1)}%`,
            display: `−${result.stop_loss_pct.toFixed(1)}%`, color: '#e05454' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: m.color ?? '#fff' }}>
              {m.display}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#868f97',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Rodar e confirmar pass**

```bash
cd /home/mateus/finswarm/web && npm run test -- ReportHero 2>&1 | tail -5
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
cd /home/mateus/finswarm && git add web/src/components/ReportHero.tsx web/src/test/ReportHero.test.tsx
git commit -m "feat: redesign ReportHero as Magazine layout with PriceChart"
```

---

## Task 10: `FundamentalAgent` — expor valores numéricos no raw

**Files:**
- Modify: `src/agents/fundamental.py`

- [ ] **Step 1: Atualizar `parse_output` para incluir valores numéricos**

O agente recebe os dados via `build_messages` mas não os repassa no raw. Precisamos guardá-los para o frontend poder exibir barras de ROE, P/L etc.

```python
# src/agents/fundamental.py
from src.agents.base import BaseAgent
from src.data.fundamentus import FundamentusData


class FundamentalAgent(BaseAgent):
    routing_key = "default"
    _last_fundamentals: FundamentusData | None = None

    def build_messages(self, fundamentals: FundamentusData) -> list[dict]:
        self._last_fundamentals = fundamentals
        prompt = f"""Você é um analista fundamentalista especializado no mercado brasileiro.

Dados fundamentalistas de {fundamentals.ticker}:
- P/L: {fundamentals.pl:.2f}
- P/VP: {fundamentals.pvp:.2f}
- ROE: {fundamentals.roe * 100:.1f}%
- Dívida Bruta/PL: {fundamentals.divida_bruta_pl:.2f}
- Margem EBIT: {fundamentals.margem_ebit * 100:.1f}%

Analise e retorne APENAS este JSON (sem markdown):
{{
  "health": "EXCELENTE" ou "BOA" ou "REGULAR" ou "RUIM",
  "valuation": "BARATO" ou "JUSTO" ou "CARO",
  "roe_interpretation": "string",
  "debt_risk": "BAIXO" ou "MODERADO" ou "ALTO",
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        result = self._extract_json(content)
        if self._last_fundamentals is not None:
            f = self._last_fundamentals
            result["_metrics"] = {
                "pl":             round(f.pl, 2),
                "pvp":            round(f.pvp, 2),
                "roe_pct":        round(f.roe * 100, 1),
                "divida_bruta_pl":round(f.divida_bruta_pl, 2),
                "margem_ebit_pct":round(f.margem_ebit * 100, 1),
            }
        return result
```

- [ ] **Step 2: Rodar testes backend**

```bash
cd /home/mateus/finswarm && poetry run pytest --timeout=30 -q 2>&1 | tail -5
```

Expected: todos passam.

- [ ] **Step 3: Commit**

```bash
cd /home/mateus/finswarm && git add src/agents/fundamental.py
git commit -m "feat: expose numeric metrics in FundamentalAgent raw output"
```

---

## Task 11: `AgentBento` — bento grid dos 7 agentes

**Files:**
- Create: `web/src/components/AgentBento.tsx`
- Create: `web/src/test/AgentBento.test.tsx`

- [ ] **Step 1: Escrever testes**

```tsx
// web/src/test/AgentBento.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentBento } from '../components/AgentBento'
import type { AnalysisResult } from '../lib/types'

function makeResult(agentOverrides: Partial<AnalysisResult['agents']> = {}): AnalysisResult {
  const base = {
    status: 'ok' as const,
    summary: 'Resumo de teste.',
    raw: {},
  }
  return {
    job_id: 'x', ticker: 'PETR4.SA', timestamp: '2026-05-13T00:00:00Z',
    recommendation: 'COMPRAR', confidence: 0.82, risk_score: 42,
    stop_loss_pct: 7.5, elapsed_seconds: 60, cost_usd: 0,
    agents: {
      technical:    { ...base, raw: { signal: 'ALTA', rsi_interpretation: 'neutro', macd_interpretation: 'positivo', bollinger_position: 'ENTRE_BANDAS', support_level: 35, resistance_level: 41 } },
      fundamental:  { ...base, raw: { health: 'BOA', valuation: 'BARATO', debt_risk: 'BAIXO', roe_interpretation: 'bom', _metrics: { pl: 6.2, pvp: 0.9, roe_pct: 18, divida_bruta_pl: 0.82, margem_ebit_pct: 24 } } },
      sentiment:    { ...base, raw: { score: 0.7, label: 'POSITIVO', catalysts: ['alta petróleo'], risks: ['risco político'] } },
      bull:         { ...base, raw: { arguments: ['arg1', 'arg2', 'arg3'], conviction: 'ALTA' } },
      bear:         { ...base, raw: { arguments: ['risco1', 'risco2', 'risco3'], conviction: 'MODERADA' } },
      risk:         { ...base, raw: { risk_score: 42, stop_loss_pct: 7.5, max_exposure_pct: 5, risk_label: 'MODERADO', main_risks: ['volatilidade', 'câmbio'] } },
      synthesis:    { ...base, raw: { recommendation: 'COMPRAR', confidence: 0.82, reasoning: 'Fundamentos sólidos justificam a compra.' } },
      ...agentOverrides,
    },
  }
}

describe('AgentBento', () => {
  it('renderiza os 7 cards de agente', () => {
    render(<AgentBento result={makeResult()} />)
    expect(screen.getByText('Análise Técnica')).toBeInTheDocument()
    expect(screen.getByText('Fundamentalista')).toBeInTheDocument()
    expect(screen.getByText('Sentimento')).toBeInTheDocument()
    expect(screen.getByText('Tese de Alta')).toBeInTheDocument()
    expect(screen.getByText('Tese de Baixa')).toBeInTheDocument()
    expect(screen.getByText('Risco')).toBeInTheDocument()
    expect(screen.getByText('Síntese Final')).toBeInTheDocument()
  })

  it('exibe signal técnico', () => {
    render(<AgentBento result={makeResult()} />)
    expect(screen.getByText('ALTA')).toBeInTheDocument()
  })

  it('exibe argumentos bull', () => {
    render(<AgentBento result={makeResult()} />)
    expect(screen.getByText('arg1')).toBeInTheDocument()
  })

  it('exibe reasoning da síntese', () => {
    render(<AgentBento result={makeResult()} />)
    expect(screen.getByText(/Fundamentos sólidos/)).toBeInTheDocument()
  })

  it('trata agente com status failed sem crash', () => {
    const r = makeResult({ technical: { status: 'failed', summary: 'erro', raw: {} } })
    expect(() => render(<AgentBento result={r} />)).not.toThrow()
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
cd /home/mateus/finswarm/web && npm run test -- AgentBento 2>&1 | tail -5
```

- [ ] **Step 3: Implementar `AgentBento.tsx`**

```tsx
// web/src/components/AgentBento.tsx
import type { AnalysisResult, AgentOutput, Recommendation } from '../lib/types'

interface Props { result: AnalysisResult }

// ── Shared primitives ─────────────────────────────────────
function CardLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily:'monospace', fontSize:9, textTransform:'uppercase',
    letterSpacing:'0.09em', color:'#868f97', marginBottom:6 }}>{children}</div>
}

function Chip({ children, color, bg, border }: { children:React.ReactNode; color:string; bg:string; border:string }) {
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 7px',
    borderRadius:999, fontSize:8, fontWeight:600, fontFamily:'monospace',
    textTransform:'uppercase', letterSpacing:'0.05em', color, background:bg,
    border:`1px solid ${border}` }}>{children}</span>
}

function BarRow({ label, value, max, color, display }: { label:string; value:number; max:number; color:string; display:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontFamily:'monospace', fontSize:8, color:'#868f97', minWidth:52 }}>{label}</span>
      <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:2, width:`${Math.min((value/max)*100,100)}%`, background:color }} />
      </div>
      <span style={{ fontFamily:'monospace', fontSize:8, color, minWidth:32, textAlign:'right' }}>{display}</span>
    </div>
  )
}

function BentoCard({ children, colSpan=1, style={} }: { children:React.ReactNode; colSpan?:number; style?: React.CSSProperties }) {
  return (
    <div style={{ gridColumn:`span ${colSpan}`, background:'rgba(255,255,255,0.03)',
      border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px', ...style }}>
      {children}
    </div>
  )
}

// ── Technical ─────────────────────────────────────────────
function TechnicalCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  if (output.status === 'failed') return (
    <BentoCard colSpan={2}><CardLabel>Análise Técnica</CardLabel>
      <p style={{ fontSize:9, color:'#e05454' }}>{output.summary}</p></BentoCard>
  )
  const rsi = typeof r.rsi === 'number' ? r.rsi : 58
  const macdPositive = (r.macd_hist ?? 0) >= 0
  const pct = (rsi / 100) * 100
  // arc: semicircle 0-100, dasharray = ~81.7 for a 26r semicircle
  const dash = 81.7
  const filled = (rsi / 100) * dash
  const rsiColor = rsi < 30 ? '#e05454' : rsi > 70 ? '#e9a84a' : '#479ffa'
  const price = r.current_price ?? 38.4
  const sup = r.support_level ?? 35.2
  const res = r.resistance_level ?? 41.8
  const pos = sup && res ? ((price - sup) / (res - sup)) * 100 : 50

  return (
    <BentoCard colSpan={2}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <CardLabel>Análise Técnica</CardLabel>
        <Chip color={macdPositive?'#4ebe96':'#e05454'} bg={macdPositive?'rgba(78,190,150,0.1)':'rgba(224,84,84,0.1)'} border={macdPositive?'rgba(78,190,150,0.2)':'rgba(224,84,84,0.2)'}>
          {r.signal ?? 'NEUTRO'}
        </Chip>
        <Chip color='#868f97' bg='rgba(134,143,151,0.08)' border='rgba(134,143,151,0.15)'>
          Bollinger: {r.bollinger_position ?? '—'}
        </Chip>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {/* RSI arc */}
        <div>
          <div style={{ fontFamily:'monospace', fontSize:8, color:'#868f97', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>RSI (14)</div>
          <div style={{ position:'relative', width:72, height:40, margin:'0 auto' }}>
            <svg viewBox="0 0 72 40" width={72} height={40}>
              <path d="M8,38 A28,28 0 0,1 64,38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} strokeLinecap="round"/>
              <path d="M8,38 A28,28 0 0,1 64,38" fill="none" stroke={rsiColor} strokeWidth={6} strokeLinecap="round"
                strokeDasharray={dash} strokeDashoffset={dash - filled}/>
            </svg>
            <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
              fontSize:13, fontWeight:700, fontFamily:'monospace', color:rsiColor }}>{rsi}</div>
          </div>
          <div style={{ textAlign:'center', fontSize:8, color:'#868f97', marginTop:2 }}>{r.rsi_interpretation ?? '—'}</div>
        </div>
        {/* MACD bars */}
        <div>
          <div style={{ fontFamily:'monospace', fontSize:8, color:'#868f97', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>MACD Histograma</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:32 }}>
            {[0.3,0.4,0.35,0.5,0.6,0.55,0.7].map((h,i) => (
              <div key={i} style={{ flex:1, height:`${h*100}%`, borderRadius:'2px 2px 0 0',
                background: macdPositive ? `rgba(78,190,150,${h})` : `rgba(224,84,84,${h})` }} />
            ))}
          </div>
          <div style={{ fontSize:7, color: macdPositive?'#4ebe96':'#e05454', marginTop:3, fontFamily:'monospace' }}>
            {macdPositive ? 'cruzou sinal ↑' : 'abaixo do sinal ↓'}
          </div>
        </div>
        {/* Suporte / Resistência */}
        <div style={{ gridColumn:'span 2' }}>
          <div style={{ fontFamily:'monospace', fontSize:8, color:'#868f97', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Suporte / Resistência</div>
          <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:3, position:'relative' }}>
            <div style={{ position:'absolute', top:'50%', transform:'translateY(-50%)',
              left:`${Math.min(Math.max(pos,2),98)}%`, width:8, height:8,
              borderRadius:'50%', background:'#ffa16c', border:'1px solid rgba(255,255,255,0.3)',
              transform:'translate(-50%,-50%)' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
            <span style={{ fontSize:8, color:'#868f97', fontFamily:'monospace' }}>R$ {r.support_level?.toFixed(2) ?? '—'}</span>
            <span style={{ fontSize:8, color:'#ffa16c', fontFamily:'monospace' }}>atual ●</span>
            <span style={{ fontSize:8, color:'#868f97', fontFamily:'monospace' }}>R$ {r.resistance_level?.toFixed(2) ?? '—'}</span>
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Sentiment ────────────────────────────────────────────
function SentimentCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const score: number = r.score ?? 0
  const pct = ((score + 1) / 2) * 100
  const color = score > 0.2 ? '#4ebe96' : score < -0.2 ? '#e05454' : '#e9a84a'
  const dash = 88
  const filled = (pct / 100) * dash

  return (
    <BentoCard>
      <CardLabel>Sentimento</CardLabel>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, margin:'6px 0' }}>
        <div style={{ position:'relative', width:80, height:44 }}>
          <svg viewBox="0 0 80 44" width={80} height={44}>
            <path d="M8,42 A32,32 0 0,1 72,42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} strokeLinecap="round"/>
            <path d="M8,42 A32,32 0 0,1 72,42" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
              strokeDasharray={dash} strokeDashoffset={dash - filled}/>
          </svg>
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
            fontSize:14, fontWeight:700, fontFamily:'monospace', color }}>{score.toFixed(1)}</div>
        </div>
        <Chip color={color} bg={`${color}1a`} border={`${color}38`}>{r.label ?? 'NEUTRO'}</Chip>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {(r.catalysts ?? []).slice(0,2).map((c:string,i:number) => (
          <div key={i} style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#4ebe96', flexShrink:0, marginTop:3 }} />
            <span style={{ fontSize:8, color:'#999999', lineHeight:1.4 }}>{c}</span>
          </div>
        ))}
        {(r.risks ?? []).slice(0,2).map((c:string,i:number) => (
          <div key={i} style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#e05454', flexShrink:0, marginTop:3 }} />
            <span style={{ fontSize:8, color:'#999999', lineHeight:1.4 }}>{c}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Fundamental ──────────────────────────────────────────
function FundamentalCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const m = r._metrics ?? {}
  const healthColor = (h:string) => ({ EXCELENTE:'#4ebe96', BOA:'#4ebe96', REGULAR:'#e9a84a', RUIM:'#e05454' }[h] ?? '#868f97')
  const valColor    = (v:string) => ({ BARATO:'#4ebe96', JUSTO:'#e9a84a', CARO:'#e05454' }[v] ?? '#868f97')
  const debtColor   = (d:string) => ({ BAIXO:'#4ebe96', MODERADO:'#e9a84a', ALTO:'#e05454' }[d] ?? '#868f97')
  const hc = healthColor(r.health ?? '')
  const vc = valColor(r.valuation ?? '')
  const dc = debtColor(r.debt_risk ?? '')

  return (
    <BentoCard>
      <CardLabel>Fundamentalista</CardLabel>
      <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:8 }}>
        <Chip color={hc} bg={`${hc}1a`} border={`${hc}38`}>{r.health ?? '—'}</Chip>
        <Chip color={vc} bg={`${vc}1a`} border={`${vc}38`}>{r.valuation ?? '—'}</Chip>
        <Chip color={dc} bg={`${dc}1a`} border={`${dc}38`}>{r.debt_risk ?? '—'}</Chip>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {m.roe_pct    !== undefined && <BarRow label="ROE"       value={m.roe_pct}         max={30}  color="#4ebe96" display={`${m.roe_pct}%`} />}
        {m.pl         !== undefined && <BarRow label="P/L"       value={m.pl}              max={30}  color="#479ffa" display={`${m.pl}×`} />}
        {m.divida_bruta_pl !== undefined && <BarRow label="Dív/PL" value={m.divida_bruta_pl} max={3}  color="#e9a84a" display={`${m.divida_bruta_pl}`} />}
        {m.margem_ebit_pct !== undefined && <BarRow label="EBIT"  value={m.margem_ebit_pct} max={40}  color="#4ebe96" display={`${m.margem_ebit_pct}%`} />}
      </div>
    </BentoCard>
  )
}

// ── Risk ─────────────────────────────────────────────────
function RiskCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  const score: number = r.risk_score ?? 50
  const riskColor = score < 35 ? '#4ebe96' : score < 65 ? '#e9a84a' : '#e05454'
  const circ = 138.2
  const filled = (score / 100) * circ

  return (
    <BentoCard colSpan={2}>
      <CardLabel>Risco</CardLabel>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr', gap:12, alignItems:'center' }}>
        {/* Dial */}
        <div style={{ position:'relative', width:64, height:64 }}>
          <svg viewBox="0 0 64 64" width={64} height={64}>
            <circle cx={32} cy={32} r={22} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7}/>
            <circle cx={32} cy={32} r={22} fill="none" stroke={riskColor} strokeWidth={7}
              strokeDasharray={circ} strokeDashoffset={circ - filled}
              strokeLinecap="round" transform="rotate(-90 32 32)"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:16, fontWeight:700, fontFamily:'monospace', color:riskColor, lineHeight:1 }}>{score}</span>
            <span style={{ fontSize:7, color:'#868f97', textTransform:'uppercase', letterSpacing:'0.06em' }}>risco</span>
          </div>
        </div>
        {/* Stop / Exposição */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:8, textTransform:'uppercase', letterSpacing:'0.07em', color:'#868f97' }}>Stop Loss</div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:'monospace', color:'#e05454' }}>−{r.stop_loss_pct?.toFixed(1) ?? '—'}%</div>
          </div>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:8, textTransform:'uppercase', letterSpacing:'0.07em', color:'#868f97' }}>Max Exposição</div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:'#cccccc' }}>{r.max_exposure_pct?.toFixed(0) ?? '—'}% carteira</div>
          </div>
        </div>
        {/* Tags de risco */}
        <div>
          <div style={{ fontFamily:'monospace', fontSize:8, textTransform:'uppercase', letterSpacing:'0.07em', color:'#868f97', marginBottom:5 }}>Principais riscos</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
            {(r.main_risks ?? []).slice(0,3).map((risk:string, i:number) => (
              <span key={i} style={{ fontSize:8, padding:'2px 7px', borderRadius:999,
                background:'rgba(233,168,74,0.08)', color:'#e9a84a',
                border:'1px solid rgba(233,168,74,0.15)', fontFamily:'monospace' }}>
                {risk}
              </span>
            ))}
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Bull ─────────────────────────────────────────────────
function BullCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  return (
    <BentoCard style={{ borderColor:'rgba(78,190,150,0.14)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ width:24, height:24, borderRadius:6, background:'rgba(78,190,150,0.12)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>🐂</div>
        <span style={{ fontSize:11, fontWeight:600, color:'#4ebe96' }}>Tese de Alta</span>
        <Chip color="#4ebe96" bg="rgba(78,190,150,0.1)" border="rgba(78,190,150,0.22)">{r.conviction ?? '—'}</Chip>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {(r.arguments ?? []).slice(0,3).map((arg:string, i:number) => (
          <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
            <span style={{ color:'#4ebe96', fontSize:9, flexShrink:0, marginTop:1 }}>↑</span>
            <span style={{ fontSize:9, color:'#999999', lineHeight:1.5 }}>{arg}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Bear ─────────────────────────────────────────────────
function BearCard({ output }: { output: AgentOutput }) {
  const r = output.raw as any
  return (
    <BentoCard style={{ borderColor:'rgba(224,84,84,0.14)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ width:24, height:24, borderRadius:6, background:'rgba(224,84,84,0.12)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>🐻</div>
        <span style={{ fontSize:11, fontWeight:600, color:'#e05454' }}>Tese de Baixa</span>
        <Chip color="#e9a84a" bg="rgba(233,168,74,0.1)" border="rgba(233,168,74,0.2)">{r.conviction ?? '—'}</Chip>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {(r.arguments ?? []).slice(0,3).map((arg:string, i:number) => (
          <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
            <span style={{ color:'#e05454', fontSize:9, flexShrink:0, marginTop:1 }}>↓</span>
            <span style={{ fontSize:9, color:'#999999', lineHeight:1.5 }}>{arg}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  )
}

// ── Synthesis ────────────────────────────────────────────
function SynthesisCard({ output, confidence }: { output: AgentOutput; confidence: number }) {
  const r = output.raw as any
  const pct = Math.round(confidence * 100)
  const circ = 163.4
  const filled = (pct / 100) * circ

  return (
    <BentoCard colSpan={3} style={{ borderColor:'rgba(255,161,108,0.18)', background:'rgba(255,161,108,0.03)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:14, alignItems:'center' }}>
        {/* Anel */}
        <div style={{ position:'relative', width:72, height:72 }}>
          <svg viewBox="0 0 72 72" width={72} height={72}>
            <circle cx={36} cy={36} r={26} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7}/>
            <circle cx={36} cy={36} r={26} fill="none" stroke="#ffa16c" strokeWidth={7}
              strokeDasharray={circ} strokeDashoffset={circ - filled}
              strokeLinecap="round" transform="rotate(-90 36 36)"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:1 }}>
            <span style={{ fontSize:8, fontWeight:700, color:'#ffa16c', textTransform:'uppercase', letterSpacing:'0.04em' }}>
              {r.recommendation ?? output.raw}
            </span>
            <span style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1 }}>{pct}%</span>
          </div>
        </div>
        {/* Texto */}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'#ffa16c', marginBottom:6 }}>Síntese Final</div>
          <div style={{ fontSize:10, color:'#999999', lineHeight:1.6 }}>{r.reasoning ?? output.summary}</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>
            <Chip color="#ffa16c" bg="rgba(255,161,108,0.1)" border="rgba(255,161,108,0.22)">{r.recommendation ?? '—'}</Chip>
            <Chip color="#4ebe96" bg="rgba(78,190,150,0.1)" border="rgba(78,190,150,0.22)">confiança {pct}%</Chip>
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

// ── Main export ──────────────────────────────────────────
export function AgentBento({ result }: Props) {
  const a = result.agents
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:8 }}>
      <TechnicalCard    output={a.technical} />
      <SentimentCard    output={a.sentiment} />
      <FundamentalCard  output={a.fundamental} />
      <RiskCard         output={a.risk} />
      <BullCard         output={a.bull} />
      <BearCard         output={a.bear} />
      <SynthesisCard    output={a.synthesis} confidence={result.confidence} />
    </div>
  )
}
```

- [ ] **Step 4: Rodar e confirmar pass**

```bash
cd /home/mateus/finswarm/web && npm run test -- AgentBento 2>&1 | tail -5
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
cd /home/mateus/finswarm && git add web/src/components/AgentBento.tsx web/src/test/AgentBento.test.tsx
git commit -m "feat: add AgentBento bento grid with per-agent visual cards"
```

---

## Task 12: Wire up — Home, Analysis, HistoryModal

**Files:**
- Modify: `web/src/pages/Home.tsx`
- Modify: `web/src/pages/Analysis.tsx`
- Modify: `web/src/components/HistoryModal.tsx`
- Modify: `web/src/components/AgentSlot.tsx`

- [ ] **Step 1: Atualizar `Home.tsx` para incluir `StockQuickPicks`**

```tsx
// Adicionar import no topo
import { StockQuickPicks } from '../components/StockQuickPicks'

// Na coluna esquerda, após o bloco do input:
<div className="w-full flex flex-col gap-4">
  {error && <ErrorBanner message={error} />}
  <TickerInput onSubmit={handleSubmit} disabled={submitting} />
  <StockQuickPicks onSelect={handleSubmit} disabled={submitting} />
</div>
```

- [ ] **Step 2: Atualizar `Analysis.tsx` para usar `AgentBento` no resultado**

```tsx
// Adicionar import
import { AgentBento } from '../components/AgentBento'

// Substituir o bloco de AgentSlots no resultado (quando result existe):
// Antes:
// <div className="flex flex-col gap-2.5">
//   {AGENT_ORDER.map((name) => (
//     <AgentSlot key={name} agent={name} status={agents[name].status}
//       elapsed={agents[name].elapsed} output={result ? result.agents[name] : null} />
//   ))}
// </div>

// Depois — manter AgentSlot apenas para tela ao vivo, mostrar AgentBento no resultado:
{result ? (
  <>
    <ReportHero result={result} />
    <AgentBento result={result} />
  </>
) : (
  <>
    <LiveHeader ticker={ticker} running={!error}
      completedCount={completedCount} currentAgent={currentAgent} />
    <div className="flex flex-col gap-2.5">
      {AGENT_ORDER.map((name) => (
        <AgentSlot key={name} agent={name} status={agents[name].status}
          elapsed={agents[name].elapsed} output={null} />
      ))}
    </div>
  </>
)}
```

- [ ] **Step 3: Atualizar `HistoryModal.tsx` para usar `AgentBento`**

```tsx
// Adicionar import
import { AgentBento } from './AgentBento'

// Substituir o bloco de AgentSlots:
{result && !loading && (
  <>
    <ReportHero result={result} />
    <AgentBento result={result} />
  </>
)}
```

- [ ] **Step 4: Atualizar cores do `AgentSlot.tsx` para nova paleta**

```tsx
const STATUS_LEFT_BAR: Record<AgentStatus, string> = {
  pending: 'bg-[rgba(255,255,255,0.08)]',
  running: 'bg-[#479ffa]',
  ok:      'bg-[rgba(71,159,250,0.4)]',
  failed:  'bg-[#e05454]',
}
const STATUS_CARD_BG: Record<AgentStatus, string> = {
  pending: 'glass',
  running: 'glass-accent shadow-[0_0_24px_rgba(71,159,250,0.12)]',
  ok:      'glass',
  failed:  'glass shadow-[0_0_16px_rgba(224,84,84,0.08)]',
}
```

- [ ] **Step 5: Rodar todos os testes**

```bash
cd /home/mateus/finswarm/web && npm run test 2>&1 | tail -10
```

Expected: todos os testes passam.

- [ ] **Step 6: Build de produção**

```bash
cd /home/mateus/finswarm/web && npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 7: Commit final**

```bash
cd /home/mateus/finswarm && git add web/src/pages/Home.tsx web/src/pages/Analysis.tsx web/src/components/HistoryModal.tsx web/src/components/AgentSlot.tsx
git commit -m "feat: wire up AgentBento, StockQuickPicks, updated AgentSlot colors"
```

---

## Task 13: Atualizar STATUS.md

**Files:**
- Modify: `docs/STATUS.md`

- [ ] **Step 1: Atualizar STATUS.md**

Atualizar a seção "Onde estamos" com as novas features e a referência ao `style.md` → nova paleta.

- [ ] **Step 2: Commit**

```bash
cd /home/mateus/finswarm && git add docs/STATUS.md
git commit -m "docs: update STATUS.md for visual overhaul"
```
