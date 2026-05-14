# FinSwarm Visual Overhaul — Design Spec
**Data:** 2026-05-13  
**Branch:** `feat/web`  
**Status:** aprovado

---

## Resumo

Redesign visual completo do frontend FinSwarm com quatro objetivos principais:
1. Atualizar paleta de cores e blobs de fundo
2. Adicionar quick picks de 10 ações B3 na Home com logos de empresa
3. Enriquecer o histórico lateral com logos e barra de confiança
4. Substituir o relatório de texto por layout Magazine com gráfico interativo real e bento grid de agentes com visuais específicos por tipo

---

## 1. Paleta de Cores

Substituir completamente as cores do `index.css` (`data-blue: #6798ff`, etc.) pela nova paleta:

| Token CSS | Hex | Uso |
|---|---|---|
| `--brand-solar` | `#ffa16c` | Recomendação destaque, síntese, anel de confiança |
| `--accent` | `#479ffa` | Cosmic Blue — botões, gráficos, tickers, logos |
| `--bg` | `#131313` | Obsidian Deep — fundo da página |
| `--surface` | `#1a1a1a` | Superfícies elevadas internas |
| `--text-primary` | `#ffffff` | Pure White — texto principal |
| `--text-smoke` | `#e6e6e6` | Light Smoke — texto de destaque secundário |
| `--text-silver` | `#cccccc` | Silver Accents — valores de métricas |
| `--text-ash` | `#999999` | Ash Gray — texto terciário |
| `--text-slate` | `#868f97` | Slate Text — labels, placeholders |
| `--positive` | `#4ebe96` | Emerald Profit — COMPRAR, positivo |
| `--warn` | `#e9a84a` | Warning — MANTER, risco moderado |
| `--negative` | `#e05454` | Negative — VENDER, risco alto |

### Glass

```css
.glass {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.glass-inner {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
}
```

---

## 2. Background Blobs (`App.tsx`)

Manter as 3 formas orgânicas atuais (mesmos `borderRadius`, posições e tamanhos). Trocar apenas as cores:

| Blob | Posição | Cor nova |
|---|---|---|
| Principal | top-left, 72vw | `#ffa16c` (Solar Flare) — `rgba(255,161,108,0.22)` |
| Secundário | bottom-right, 68vw | `#868f97` (Slate) — `rgba(134,143,151,0.20)` |
| Accent | center-right, 28vw | `#ffa16c` leve — `rgba(255,161,108,0.08)` |

**Hover de cards:** substituir todos os `rgba(103,152,255,x)` por `rgba(134,143,151,x)` (`#868f97`).

---

## 3. Home — Quick Picks B3

### Layout
Abaixo do `TickerInput`, adicionar seção com label "Principais da B3" e grid 5×2:

```
[ PETR4 ] [ VALE3 ] [ ITUB4 ] [ BBDC4 ] [ ABEV3 ]
[ WEGE3 ] [ B3SA3 ] [ BBAS3 ] [ MGLU3 ] [ RENT3 ]
```

### Componente `StockQuickPicks`
- Novo componente `web/src/components/StockQuickPicks.tsx`
- Cada card: logo (iniciais) + ticker + nome da empresa
- Clique chama `onSubmit(ticker + '.SA')` diretamente
- Hover: `border-color: rgba(134,143,151,0.4)`, `background: rgba(134,143,151,0.07)`

### Logo
Iniciais coloridas geradas localmente. Todas usam Cosmic Blue:
```tsx
color: '#479ffa'
background: 'rgba(71,159,250,0.08)'
border: '1px solid rgba(71,159,250,0.16)'
```

### Lista das 10 ações

| Ticker | Iniciais | Nome |
|---|---|---|
| PETR4.SA | PB | Petrobras |
| VALE3.SA | VA | Vale |
| ITUB4.SA | IT | Itaú |
| BBDC4.SA | BD | Bradesco |
| ABEV3.SA | AB | Ambev |
| WEGE3.SA | WG | WEG |
| B3SA3.SA | B3 | B3 |
| BBAS3.SA | BN | Banco do Brasil |
| MGLU3.SA | MG | Magalu |
| RENT3.SA | LC | Localiza |

---

## 4. Histórico — Logos + Confiança

### Mudanças em `HistoryDrawer.tsx`
Cada item da lista passa de linha compacta para card com:
- Logo 34px (iniciais Cosmic Blue) à esquerda
- Linha superior: ticker (accent) + nome empresa + badge rec + data
- Linha inferior: percentual de confiança + mini barra colorida por recomendação

```tsx
// Mini barra
COMPRAR → background: var(--positive)   // #4ebe96
MANTER  → background: var(--warn)       // #e9a84a
VENDER  → background: var(--negative)   // #e05454
```

### Mapa de nomes de empresa
Novo arquivo `web/src/lib/companyMeta.ts`:
```ts
export const COMPANY_META: Record<string, { name: string; initials: string }> = {
  'PETR4': { name: 'Petrobras',      initials: 'PB' },
  'VALE3': { name: 'Vale',           initials: 'VA' },
  'ITUB4': { name: 'Itaú',           initials: 'IT' },
  'BBDC4': { name: 'Bradesco',       initials: 'BD' },
  'ABEV3': { name: 'Ambev',          initials: 'AB' },
  'WEGE3': { name: 'WEG',            initials: 'WG' },
  'B3SA3': { name: 'B3',             initials: 'B3' },
  'BBAS3': { name: 'Banco do Brasil',initials: 'BN' },
  'MGLU3': { name: 'Magalu',         initials: 'MG' },
  'RENT3': { name: 'Localiza',       initials: 'LC' },
}
// Fallback: primeiras 2 letras do ticker
```

---

## 5. Gráfico de Preço Real

### Backend — novo endpoint

**Arquivo:** `src/api.py`  
**Rota:** `GET /chart/{ticker}`  
**Query params:** `period` (1mo | 3mo | 6mo | 1y, default: 3mo), `interval` (1d, default: 1d)

```python
@app.get("/chart/{ticker}")
async def get_chart(ticker: str, period: str = "3mo", interval: str = "1d"):
    t = yf.Ticker(ticker)
    hist = t.history(period=period, interval=interval)
    return [
        {
            "time": int(ts.timestamp()),
            "open": row.Open, "high": row.High,
            "low": row.Low,   "close": row.Close,
            "volume": row.Volume,
        }
        for ts, row in hist.iterrows()
    ]
```

**Proxy em `vite.config.ts`:** adicionar `/chart` ao proxy existente.

### Frontend — componente `PriceChart`

**Arquivo:** `web/src/components/PriceChart.tsx`  
**Biblioteca:** `lightweight-charts` v4 (TradingView) — instalar via npm

```tsx
interface PriceChartProps {
  ticker: string
  height?: number
}
```

- Busca `/chart/{ticker}?period=3mo` no mount
- Range selector: `1M · 3M · 6M · 1A` — re-fetch ao trocar
- Série: `AreaSeries` com `lineColor: '#479ffa'`, `topColor: rgba(71,159,250,0.18)`, `bottomColor: transparent`
- Crosshair interativo com label de preço
- Linha de preço atual (dashed)
- Eixos em `#868f97`, grid em `rgba(255,255,255,0.04)`
- Loading state: skeleton shimmer durante fetch

---

## 6. Relatório Magazine

### `ReportHero.tsx` — refatoração completa

**Estrutura:**

```
┌─────────────────────────────────────────────────────┐
│ COMPRAR (Solar Flare, 30px bold)                    │
│ PETR4.SA · Petrobras · Energia  (Slate, 9px mono)  │
│                         [82% confiança] [risco 42] │
├─────────────────────────────────────────────────────┤
│  [PriceChart — 160px, interactive]                 │
│  [range: 1M · 3M · 6M · 1A]                        │
├─────────────────────────────────────────────────────┤
│ [R$ 38,40  Preço] [+12,4%  20d] [RSI 58  Momentum] │
└─────────────────────────────────────────────────────┘
```

- Cor da recomendação: sempre Solar Flare `#ffa16c` (não muda por tipo — o badge colorido já comunica o estado)
- Badge confiança: Emerald Profit
- Badge risco: Warn se < 65, Negative se ≥ 65

---

## 7. Bento Grid de Agentes

### Novo componente `AgentBento.tsx`

Substitui a lista de `AgentSlot` no relatório completo (tanto `Analysis.tsx` quanto `HistoryModal.tsx`).  
`AgentSlot` existente é mantido **apenas para a tela ao vivo** (durante a análise rodando).

**Grid layout** (3 colunas):

```
[ Técnico      2col ] [ Sentimento  1col ]
[ Fundamentalista 1col ] [ Risco    2col ]
[ Bull         1col ] [ Bear        1col ] [ _ ]
[ Síntese              3col             ]
```

### Cards por agente

#### `AgentCardTechnical` (2 col)
Campos usados de `raw`: `signal`, `rsi`, `macd_hist`, `support_level`, `resistance_level`, `bb_upper`, `bb_mid`, `bb_lower`
- Chip de signal (ALTA/BAIXA/NEUTRO)
- RSI: arco semicircular SVG (0–100), cor por zona (< 30 negativo, > 70 warn, resto accent)
- MACD: barras histograma (7 barras, coloridas por valor positivo/negativo)
- Suporte/Resistência: faixa horizontal com marcador do preço atual
- Bollinger: 3 zonas visuais (inferior / central / superior) com dot na posição atual

#### `AgentCardSentiment` (1 col)
Campos usados: `score`, `label`, `catalysts`, `risks`
- Gauge semicircular (-1 → +1), cor por score
- Bullets: catalisadores (verde) + riscos (vermelho), máx 2 cada

#### `AgentCardFundamental` (1 col)
Campos usados: `health`, `valuation`, `debt_risk` + dados originais `pl`, `pvp`, `roe`, `divida_bruta_pl`, `margem_ebit` (precisam ser incluídos no `raw` do agente)
- Chips: health + valuation + debt_risk
- Barras: ROE, P/L, Dívida/PL, Margem EBIT

> **Nota backend:** `FundamentalAgent.parse_output` deve incluir os valores numéricos originais no dict retornado para ficarem disponíveis em `raw`.

#### `AgentCardRisk` (2 col)
Campos usados: `risk_score`, `stop_loss_pct`, `max_exposure_pct`, `risk_label`, `main_risks`
- Dial circular SVG com `risk_score` (0–100), cor: < 35 positivo, < 65 warn, ≥ 65 negativo
- Stop loss e max exposição como valores + barra
- Tags dos `main_risks` (máx 3)

#### `AgentCardBull` (1 col)
Campos usados: `arguments`, `conviction`
- Cabeçalho verde com emoji 🐂 + conviction badge
- 3 argumentos com marcador ↑

#### `AgentCardBear` (1 col)
Campos usados: `arguments`, `conviction`
- Cabeçalho vermelho com emoji 🐻 + conviction badge
- 3 argumentos com marcador ↓

#### `AgentCardSynthesis` (3 col — full width)
Campos usados: `recommendation`, `confidence`, `reasoning`
- Anel SVG de confiança (0–100%) em Solar Flare
- Reasoning como texto (não JSON bruto)
- Chips: recomendação + confiança + stop loss (vindo do agente de risco)

---

## 8. Arquivos afetados

| Arquivo | Operação |
|---|---|
| `web/src/index.css` | Substituir paleta inteira |
| `web/src/App.tsx` | Atualizar cores dos blobs |
| `web/src/pages/Home.tsx` | Adicionar `StockQuickPicks` |
| `web/src/pages/Analysis.tsx` | Substituir `AgentSlot` por `AgentBento` no resultado final |
| `web/src/components/TickerInput.tsx` | Atualizar cores hover/focus |
| `web/src/components/HistoryDrawer.tsx` | Adicionar logos + barra de confiança |
| `web/src/components/HistoryModal.tsx` | Usar `AgentBento` em vez de `AgentSlot` |
| `web/src/components/ReportHero.tsx` | Redesign completo (Magazine) |
| `web/src/components/AgentSlot.tsx` | Manter para tela ao vivo, atualizar cores |
| `web/src/components/AgentBento.tsx` | **Novo** — bento grid completo |
| `web/src/components/PriceChart.tsx` | **Novo** — gráfico TradingView |
| `web/src/components/StockQuickPicks.tsx` | **Novo** — grid 5×2 |
| `web/src/lib/companyMeta.ts` | **Novo** — mapa ticker → nome + iniciais |
| `web/src/lib/api.ts` | Adicionar `fetchChart(ticker, period)` |
| `src/api.py` | Adicionar `GET /chart/{ticker}` |
| `web/vite.config.ts` | Adicionar `/chart` ao proxy |
| `web/package.json` | Adicionar `lightweight-charts` |

---

## 9. Fora de escopo

- `AgentSlot` durante análise ao vivo — mantido sem mudanças visuais grandes
- Tela de análise em progresso (`LiveHeader`, `AgentTimeline`) — intacta
- Testes existentes — não quebrar (31 testes devem continuar verdes)
- Backend: orchestrator, DB, WebSocket — sem alterações
