# FinSwarm — Status do Projeto (2026-05-15)

## Onde estamos

Branch ativo: **`feat/web`** (50+ commits à frente de `main`).

- Backend FinSwarm (Python) — completo e funcional. **68 testes unitários verdes**.
- Frontend FinSwarm Web (Vite + React + TS + Tailwind v4) — completo, **54 testes verdes**, `npm run build` verde.
- **StockDetail v2 com 8 abas (2026-05-15) — implementado:**
  - 7 abas funcionais: Visão geral, Finanças, Notícias, Comunidade FinSwarm, Sinais técnicos, Previsões, Sazonais
  - 1 placeholder: Títulos ("em breve")
  - Backend: 6 endpoints REST sob `/stock/:ticker`, cache 2 camadas (memória TTL + SQLite em `data/stock_cache.db`)
  - Frontend: 14 widgets reutilizáveis (KPICard, SkeletonCard, PieChartSVG, BarChartSVG, GaugeWidget, DotsChartSVG, SeasonalsBars, SeasonalsOverlay, IdeaCard, NewsItem, AboutCard, IndicatorRow, PivotsTable), 8 panels, `useStockData` com cache de sessão por aba
- Integração e2e backend↔frontend — **funcional**. WebSocket (Chrome ↔ uvicorn) resolvido com `--ws wsproto` + bypass direto no `useAnalysis.ts`.
- Persistência SQLite — **implementada**. Análises concluídas são salvas em `data/analyses.db`.
- **Visual Overhaul (2026-05-13) — implementado + refinamentos aplicados:**
  - Nova paleta Solar Flare, `CompanyLogo`, `HistoryModal` tela cheia, `PriceChart` TradingView, `AgentBento` bento grid.
- **Home redesign (2026-05-14) — implementado:**
  - Layout coluna única centrado; sem `HistoryDrawer`.
  - Cards B3 (`StockQuickPicks`) e `TickerInput` **navegam para `/stock/:ticker`** em vez de iniciar análise direto.
  - Cards dinâmicos para tickers já analisados buscados de `GET /analyses` no mount.
- **StockDetail v1 (2026-05-14) — implementado** em `/stock/:ticker`:
  - Cabeçalho com `CompanyLogo` + nome + badge B3 + botão ← Voltar.
  - Bloco de cotação (preço, variação, fechamento anterior) via `GET /quote/:ticker`.
  - `PriceChart` embutido (1M/3M/6M/1A).
  - 5 stat cards (Vol., Mkt Cap, P/L, P/VP, DY).
  - CTA "Analisar com FinSwarm" que navega para `/analysis/:jobId`.
- **Backend: `GET /quote/:ticker`** — yfinance `fast_info` + `.info` (P/L, P/VP, DY, short_name).
  - **Atenção:** `dividendYield` do yfinance para ações BR já vem em % (ex: `8.66`), não decimal. Não multiplicar por 100.
- **StockDetail v2 — spec + plano prontos para execução (Fases A–G, 40 tarefas):**
  - 8 tabs: Visão geral, Finanças, Notícias, Comunidade FinSwarm, Sinais técnicos, Previsões, Sazonais, Títulos.
  - Spec: `docs/superpowers/specs/2026-05-14-stock-detail-tabs-design.md`
  - Plano: `docs/superpowers/plans/2026-05-14-stock-detail-tabs.md`
  - Referência estrutural: `relatorio-tradingview-bbas3.md` (análise detalhada da página BBAS3 no TradingView)

## Stack

- **Backend:** Python 3.12, FastAPI, OpenRouter via OpenAI SDK, yfinance, fundamentus, GNews, 7 agentes orquestrados com asyncio, aiosqlite.
- **Frontend:** Vite 5, React 18, TypeScript 5, Tailwind v4 (`@tailwindcss/vite`), React Router 6, Vitest + RTL + mock-socket.
- **Estilo visual:** `style.md` (raiz do repo) — referência de design ativo (v2 Solar Flare palette). `index.css` aplica os tokens.

## Como rodar

```bash
# Backend (terminal 1, dentro de ~/finswarm)
poetry run uvicorn src.api:app --port 8000 --ws wsproto

# Frontend (terminal 2)
cd web && npm run dev
# abre em http://localhost:5173
```

**IMPORTANTE — `--ws wsproto`:** sem essa flag o backend rejeita handshakes WebSocket do Chrome com 400 Bad Request (a lib `websockets` 16.0 é estrita demais com headers do browser). `wsproto` é a alternativa permissiva e já está em `pyproject.toml`.

## Estrutura

```
finswarm/
├── src/                              # backend Python
│   ├── api.py                        # FastAPI + CORS + lifespan (init_db) + GET /chart/{ticker}
│   ├── db.py                         # SQLite via aiosqlite (init, save, list, get)
│   ├── orchestrator.py
│   ├── models.py                     # AnalysisResult, AnalysisRow, WsEvent, ...
│   ├── agents/                       # 7 agentes (fundamental expõe _metrics)
│   ├── data/                         # yfinance, fundamentus, news
│   └── llm/
│       ├── client.py                 # AsyncOpenAI → OpenRouter
│       ├── routing.py                # ROUTING_TABLE
│       └── cache.py
├── web/                              # frontend Vite
│   ├── vite.config.ts                # proxy /analyze /analyses /health /chart /quote /ws
│   ├── src/
│   │   ├── main.tsx, App.tsx         # blobs orgânicos Solar Flare + Slate + rota /stock/:ticker
│   │   ├── index.css                 # @theme tailwind v4 + .glass/.glass-inner/.glass-accent + animações
│   │   ├── pages/
│   │   │   ├── Home.tsx              # coluna única; StockQuickPicks+TickerInput → /stock/:ticker
│   │   │   ├── StockDetail.tsx       # v1: cotação + PriceChart + stats + CTA analisar
│   │   │   └── Analysis.tsx          # split timeline + AgentSlots (ao vivo) | ReportHero+AgentBento (resultado)
│   │   ├── components/
│   │   │   ├── TickerInput.tsx
│   │   │   ├── AgentTimeline.tsx
│   │   │   ├── AgentTimelineItem.tsx
│   │   │   ├── AgentSlot.tsx         # estado ao vivo com .glass-accent quando running
│   │   │   ├── AgentBento.tsx        # bento grid 7 agentes (resultado final)
│   │   │   ├── AgentCard.tsx         # legado, mantido p/ tests
│   │   │   ├── CompanyLogo.tsx       # favicon Google + fallback iniciais
│   │   │   ├── PriceChart.tsx        # gráfico TradingView (lightweight-charts v4)
│   │   │   ├── StockQuickPicks.tsx   # grid 5x2 quick picks B3 com CompanyLogo + extraTickers prop
│   │   │   ├── ReportHero.tsx        # layout Magazine com PriceChart
│   │   │   ├── ErrorBanner.tsx
│   │   │   ├── HistoryDrawer.tsx     # logos reais + barra de confiança
│   │   │   ├── HistoryModal.tsx      # tela cheia: ← Voltar, 2 colunas 380px+1fr
│   │   │   └── ui/{Button,Card,Badge}.tsx
│   │   └── lib/
│   │       ├── types.ts              # AGENT_ORDER, AnalysisResult, AnalysisRow, WsEvent, QuoteData
│   │       ├── agentLabels.ts
│   │       ├── companyMeta.ts        # mapa ticker → nome + iniciais + COMPANY_DOMAIN
│   │       ├── api.ts                # postAnalyze, fetchAnalyses, fetchAnalysis, fetchChart, fetchQuote
│   │       └── useAnalysis.ts        # hook WebSocket
│   └── test/                         # 49 testes vitest
├── relatorio-tradingview-bbas3.md    # análise estrutural do TradingView BBAS3 (referência v2)
├── style.md                          # design system v2 (ÚNICA fonte de verdade visual)
├── data/                             # ignorado pelo git
│   └── analyses.db                   # SQLite — criado automaticamente
├── docs/
│   ├── STATUS.md                     # você está aqui
│   └── superpowers/
│       ├── specs/
│       │   ├── 2026-05-12-finswarm-web-design.md
│       │   ├── 2026-05-13-persistence-history-design.md
│       │   └── 2026-05-14-stock-detail-tabs-design.md  # spec das 8 tabs (v2)
│       └── plans/
│           ├── 2026-05-12-finswarm-web.md
│           ├── 2026-05-13-persistence-history.md
│           └── 2026-05-14-stock-detail-tabs.md         # plano 40 tarefas fases A–G
└── pyproject.toml                    # + wsproto, aiosqlite, pytest-timeout
```

## Routing LLM atual

```python
"default":   primary="openai/gpt-oss-120b:free",        fallback="z-ai/glm-4.5-air:free"
"sentiment": primary="z-ai/glm-4.5-air:free",           fallback="openai/gpt-oss-120b:free"
"synthesis": primary="nvidia/nemotron-3-super-120b-a12b:free", fallback="openai/gpt-oss-120b:free"
# backoff: [10, 25, 50] segundos
```

**Histórico:** `meta-llama/llama-3.3-70b-instruct:free` e `qwen/qwen3-next-80b-a3b-instruct:free` davam TIMEOUT upstream em 2026-05-12. Foram removidos. Os 3 acima respondiam OK no mesmo horário.

## To-do (próximas sessões)

### [x] Visual Overhaul — Magazine + Bento Grid + Price Chart (2026-05-13)

- Nova paleta, blobs, `StockQuickPicks`, logos no histórico, `ReportHero` Magazine, `PriceChart` TradingView, `AgentBento` bento grid.

### [x] Persistência de análises (SQLite — MVP)

- `src/db.py` + `data/analyses.db` + endpoints `GET /analyses` e `GET /analyses/{job_id}`.
- `HistoryDrawer` sempre visível na coluna direita da Home; busca por ticker, filtro por recomendação.
- `HistoryModal` overlay com relatório completo ao clicar num item do histórico.
- Drawer recarrega automaticamente ao retornar de uma análise (via `location.key`).

### [x] Refinamentos visuais (2026-05-13)

- `CompanyLogo` com favicons reais via Google Favicons + fallback para iniciais.
- `HistoryDrawer`: cursor-pointer nos chips, overflow da data corrigido, sem scrollbar horizontal.
- `HistoryModal`: virou tela cheia, fecha só via "← Voltar", layout 2 colunas dashboard.
- `PriceChart`: largura mínima 100px + requestAnimationFrame corrige gráfico vazio em modal.
- `Home`: textos `#e6e6e6`/`#cccccc` em vez de branco puro.

### [x] Home redesign + StockDetail v1 (2026-05-14)

- Home: layout coluna única, sem HistoryDrawer, cards navegam para `/stock/:ticker`.
- `StockDetail` v1 em `/stock/:ticker`: cotação ao vivo, PriceChart, 5 stats, CTA analisar.
- Backend: `GET /quote/:ticker` via yfinance `fast_info`.

### [x] StockDetail v2 — 8 tabs estilo TradingView (2026-05-15)

**Plano:** `docs/superpowers/plans/2026-05-14-stock-detail-tabs.md` (40 tarefas, Fases A–G — todas concluídas)

- Fase A: cache SQLite para cotações + dados de ações
- Fase B: 6 endpoints backend (technicals, financials, news, community, seasonals, forecast)
- Fase C: `stockApi.ts` + `useStockData` hook (progressive loading, session cache)
- Fase D: widgets SVG reutilizáveis (MiniLineChart, MiniBarChart, GaugeWidget, etc.)
- Fase E: 8 painéis de tab (OverviewPanel, FinancialsPanel, NewsPanel, etc.)
- Fase F: `StockDetail` orquestrador reescrito com sticky tabs + CTA flutuante
- Fase G: polish final (skeleton loaders, empty states, a11y)

## Fora do MVP (não priorizado)

- Autenticação
- Export PDF / share image
- Deploy
- i18n

## Para retomar a sessão

**Ler nesta ordem:**

1. **`docs/STATUS.md`** (este arquivo) — começa aqui sempre.
2. **`style.md`** — referência visual obrigatória pra qualquer mexida em UI (design system v2).
3. **`docs/superpowers/specs/2026-05-14-stock-detail-tabs-design.md`** — spec das 8 tabs (próximo milestone).
4. **`docs/superpowers/plans/2026-05-14-stock-detail-tabs.md`** — plano 40 tarefas Fases A–G (executar este).

**Pesquisar no log:**

```bash
git log --oneline feat/web ^main
```

**Cuidados ao retomar:**

- Backend deve subir com `--ws wsproto` SEMPRE em dev.
- `npm run dev` deve estar rodando — se houver Vite zumbi (`pgrep -af vite`), matar antes.
- Modelos `:free` mudam de estabilidade. Antes de declarar bug, pingar cada modelo:

```python
poetry run python -c "
from dotenv import load_dotenv; load_dotenv()
import asyncio, os
from openai import AsyncOpenAI
async def t(m):
    c = AsyncOpenAI(base_url='https://openrouter.ai/api/v1', api_key=os.environ['OPENROUTER_API_KEY'])
    try:
        await asyncio.wait_for(c.chat.completions.create(model=m, messages=[{'role':'user','content':'OK'}]), 20)
        print(m, 'OK')
    except Exception as e:
        print(m, 'FAIL', type(e).__name__)
async def main():
    for m in ['openai/gpt-oss-120b:free','z-ai/glm-4.5-air:free','nvidia/nemotron-3-super-120b-a12b:free']:
        await t(m)
asyncio.run(main())
"
```
