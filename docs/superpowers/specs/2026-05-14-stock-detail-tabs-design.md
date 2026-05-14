# Spec — StockDetail com 8 abas inspiradas no TradingView

**Data:** 2026-05-14
**Autor:** FinSwarm (Mateus Sampaio + Claude)
**Branch alvo:** `feat/web`
**Referências:**
- `relatorio-tradingview-bbas3.md` (raiz do repo) — análise estrutural da página BBAS3 do TradingView
- `EXEMPLO-B3.html` (raiz do repo) — HTML salvo da página BBAS3
- `.superpowers/brainstorm/37617-1778783869/content/tabs-v2.html` — mockup visual aprovado
- `style.md` (raiz do repo) — design system v2 Solar Flare

---

## 1. Motivação

A `StockDetail` atual mostra apenas cotação + chart + 5 KPIs + botão de análise. Esse nível de informação não justifica a navegação extra entre a Home e o clique para Analisar — o usuário não tem por que parar nessa tela.

A meta é transformar a `StockDetail` num **hub de decisão** ao estilo TradingView: o usuário entende o ativo (técnico, fundamentos, notícias, sentimento, sazonalidade, previsões, análises FinSwarm anteriores) antes de decidir rodar uma análise nova. A página passa a ter valor em si mesma.

## 2. Escopo

**Em escopo:**
- 7 abas funcionais com dados reais: Visão geral, Finanças, Notícias, Comunidade FinSwarm, Sinais técnicos, Previsões, Sazonais
- 1 aba placeholder estática: Títulos ("em breve")
- 6 endpoints REST no backend, cache de 2 camadas (memória + SQLite)
- Carregamento progressivo no frontend (lazy por aba)
- Interações: notícia clicável (abre URL externo), tooltips em gráficos de linha/barra, cards de Comunidade FinSwarm abrem `HistoryModal`
- Estética glass + blobs do FinSwarm v2

**Fora de escopo (MVP):**
- Mobile/responsive (foco desktop, 1280px+)
- Aba Títulos com dados reais (sem fonte gratuita confiável; placeholder por enquanto)
- Streaming em tempo real (WS para preço) — preço atualiza ao recarregar
- i18n (apenas pt-BR)
- Comparação multi-ticker
- Exportar relatório (PDF/share)
- Refresh manual ("recarregar")

## 3. Arquitetura geral

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (web/)                                              │
│   StockDetail.tsx ─┬─ StockHeader (price block, ações)       │
│                    ├─ TabBar (8 abas)                        │
│                    └─ Panel ativo (lazy)                     │
│                       └─ widgets/ (KPICard, GaugeWidget...)  │
│   useStockData(ticker, tab) — cache de sessão                │
└──────────────────────────────┬──────────────────────────────┘
                               │ /stock/{ticker}/{section}
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (src/api.py)                                         │
│   6 endpoints REST                                           │
│   ↓                                                          │
│   src/stock_service.py  (lógica por aba)                     │
│   ↓                                                          │
│   src/cache.py  (get_or_fetch — 2 camadas)                   │
│   ├── memória  (cachetools.TTLCache)                         │
│   └── SQLite   (data/stock_cache.db)                         │
│       ↓ miss em ambos                                        │
│   yfinance + fundamentus + GNews  (via asyncio.to_thread)    │
└─────────────────────────────────────────────────────────────┘
```

## 4. Backend

### 4.1 Endpoints

Todos sob `/stock/{ticker}` no `src/api.py`. `ticker` recebido como `PETR4` (sem `.SA`); backend adiciona `.SA` antes de chamar yfinance.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/stock/{ticker}/overview` | Visão geral completa |
| GET | `/stock/{ticker}/financials` | Aba Finanças |
| GET | `/stock/{ticker}/news?limit=20&cursor=...` | Notícias paginadas |
| GET | `/stock/{ticker}/technicals` | Sinais técnicos |
| GET | `/stock/{ticker}/forecast` | Previsões |
| GET | `/stock/{ticker}/seasonals` | Sazonais |

A aba **Comunidade FinSwarm** reusa `/analyses` existente, que ganha filtro opcional `?ticker=PETR4` (alteração mínima em `src/db.py` e `src/api.py`).

A aba **Títulos** é puro frontend — não envolve backend.

### 4.2 Cache de 2 camadas (`src/cache.py`)

**Interface:**
```python
async def get_or_fetch(
    key: str,
    ttl: timedelta,
    fetcher: Callable[[], Awaitable[T]] | Callable[[], T],
) -> T: ...
```

**Lógica:**
1. Checa `_memory_cache` (cachetools.TTLCache, maxsize=512). Hit → retorna.
2. Checa SQLite: `SELECT value, expires_at FROM cache_entries WHERE key = ?`. Hit válido → desserializa, popula memória, retorna.
3. Miss → chama `fetcher()` (wrap em `asyncio.to_thread` se sync). Serializa o resultado (`json` + `gzip.compress` para reduzir tamanho), grava em SQLite com `expires_at = now + ttl`, popula memória, retorna.

**Schema SQLite** (`data/stock_cache.db`, init no `lifespan` do FastAPI):
```sql
CREATE TABLE IF NOT EXISTS cache_entries (
  key TEXT PRIMARY KEY,
  value BLOB NOT NULL,
  expires_at INTEGER NOT NULL  -- unix timestamp
);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);
```

**Limpeza**: ao inicializar, deleta entradas onde `expires_at < now`. Sem GC contínuo (volume pequeno).

**Chaves**: `f"{section}:{ticker}"`, ex: `"overview:PETR4.SA"`, `"technicals:PETR4.SA"`. Sub-fetchers internos podem usar chaves mais granulares (`"yf_info:PETR4.SA"`, `"yf_history:PETR4.SA:1y"`) para que múltiplos endpoints compartilhem os dados primitivos do yfinance.

### 4.3 TTLs

| Tipo de dado | Chave exemplo | TTL |
|---|---|---|
| Quote/preço atual | `yf_quote:{ticker}` | 30s |
| Chart history | `yf_history:{ticker}:1y` | 1h |
| `info` completo | `yf_info:{ticker}` | 6h |
| `financials`, `balance_sheet`, `cashflow` | `yf_financials:{ticker}` | 12h |
| `recommendations`, `analyst_price_targets` | `yf_forecast:{ticker}` | 24h |
| Sazonais (history 5y mensal agregado) | `yf_seasonal:{ticker}` | 24h |
| Notícias headlines (GNews) | `gnews:{ticker}` | 5min |
| Sentimento por título | `sentiment:{md5(title)}` | permanente |
| Responses dos endpoints `/stock/X/Y` | `overview:{ticker}` etc. | igual ao dado primário mais curto |

### 4.4 Serviço por aba (`src/stock_service.py`)

Módulo novo com uma função async por aba que orquestra fetches do yfinance/fundamentus/GNews e devolve o dict tipado:

```python
async def get_overview(ticker: str) -> OverviewResponse: ...
async def get_financials(ticker: str) -> FinancialsResponse: ...
async def get_news(ticker: str, limit: int = 20, cursor: str | None = None) -> NewsResponse: ...
async def get_technicals(ticker: str) -> TechnicalsResponse: ...
async def get_forecast(ticker: str) -> ForecastResponse: ...
async def get_seasonals(ticker: str) -> SeasonalsResponse: ...
```

Cada uma usa `get_or_fetch` internamente e chama os primitivos do yfinance via `asyncio.to_thread`. Múltiplos endpoints compartilham fetches primários (ex: `overview` e `financials` ambos consomem `yf_info:{ticker}` cacheado).

### 4.5 Cálculos de indicadores técnicos (`src/technicals.py`)

Módulo novo, puro pandas/numpy, sem dependências adicionais:

- **Osciladores**: RSI(14), MACD(12,26,9), Stoch(%K,%D), CCI(20), Williams %R(14), Ultimate Oscillator, ROC(12), Awesome Oscillator
- **Médias móveis**: SMA(5,10,20,50,200), EMA(20,50), WMA(20)
- **Pivôs** (a partir do OHLC do dia anterior): Clássico, Fibonacci, Camarilla, Woodie, DM (Demark)
- **Agregador**: `compute_signals(history_df) → dict` retorna valores + sinal `BUY`/`SELL`/`NEUTRAL` por indicador, agregando para o resumo geral

Regras de sinal por indicador documentadas como constantes (ex: `RSI < 30 → BUY`, `30 ≤ RSI ≤ 70 → NEUTRAL`, `RSI > 70 → SELL`).

### 4.6 Sentimento de notícias

- Função `classify_sentiment(titles: list[str]) → list[Literal['POS','NEG','NEU']]`
- Usa `LLMClient` existente, modelo `default` da `ROUTING_TABLE`
- Prompt batch único: "Classifique cada título como POS, NEG ou NEU. Retorne JSON array."
- Cache por hash do título (`sentiment:{md5(title)}` permanente no SQLite)
- Pre-fetch: ao chamar `/news`, pega títulos novos (cache miss), classifica em batch único, persiste

### 4.7 Sazonais

Calculado de `yf.Ticker(t).history(period='5y', interval='1mo')`:
- Para cada mês 1-12: `avg_return_pct = mean(returns_do_mes_em_cada_ano)`
- Retornos por ano: `years[i] = {year: 2021, data: [{month, return_pct}, ...]}`

## 5. Contratos de dados

Pydantic models em `src/models.py` (novos, ao lado dos existentes):

```python
class QuoteData(BaseModel):
    price: float; prev_close: float; change: float; change_pct: float
    volume: int | None; mkt_cap: float | None; currency: str

class ProfileData(BaseModel):
    long_name: str; summary: str; ceo: str | None; founded: int | None
    employees: int | None; website: str | None; sector: str | None; industry: str | None

class KPIData(BaseModel):
    mkt_cap: float | None; div_yield: float | None; pl_12m: float | None
    eps_12m: float | None; beta: float | None; volatility: float | None
    last_quarter_profit: float | None

class EarningsData(BaseModel):
    date: str  # ISO
    period: str  # "Q1 2026"
    eps_reported: float | None; eps_estimate: float | None; eps_surprise_pct: float | None
    revenue_reported: float | None; revenue_estimate: float | None; revenue_surprise_pct: float | None

class ShareholdersData(BaseModel):
    closely_held_pct: float | None; free_float_pct: float | None; total_shares: float | None

class SeasonalMonth(BaseModel):
    month: int  # 1-12
    avg_return_pct: float

class TechnicalsSummary(BaseModel):
    signal: Literal['STRONG_BUY','BUY','NEUTRAL','SELL','STRONG_SELL']
    today: str; week: str; month: str  # idem

class ForecastSummary(BaseModel):
    target_mean: float | None; target_high: float | None; target_low: float | None
    current: float | None; recommendations: dict[str, int]  # {strong_buy: 5, ...}

class NewsPreviewItem(BaseModel):
    title: str; source: str; published_at: str; url: str | None
    sentiment: Literal['POS','NEG','NEU'] | None; sentiment_score: int | None  # -100..+100

class OverviewResponse(BaseModel):
    ticker: str
    quote: QuoteData
    profile: ProfileData
    kpis: KPIData
    last_earnings: EarningsData | None
    next_earnings: dict | None
    shareholders: ShareholdersData
    seasonals_mini: list[SeasonalMonth]
    news_preview: list[NewsPreviewItem]
    technicals_summary: TechnicalsSummary
    forecast_summary: ForecastSummary
```

Demais responses (`FinancialsResponse`, `NewsResponse`, `TechnicalsResponse`, `ForecastResponse`, `SeasonalsResponse`) seguem o mesmo padrão; campos detalhados em comentários do código durante implementação.

## 6. Frontend

### 6.1 Estrutura

```
web/src/
  pages/
    StockDetail.tsx              ← orquestrador
  components/stock/
    StockHeader.tsx              ← logo+ticker+price+ações no topo
    TabBar.tsx                   ← 8 tabs underline-style
    panels/
      OverviewPanel.tsx
      FinancialsPanel.tsx        ← com sub-tabs internas (round-pill)
      NewsPanel.tsx
      CommunityPanel.tsx         ← reusa /analyses?ticker=
      TechnicalsPanel.tsx
      ForecastPanel.tsx
      SeasonalsPanel.tsx
      BondsPanel.tsx             ← placeholder "em breve"
    widgets/
      KPICard.tsx
      KPIGrid.tsx                ← grid responsivo de KPICards
      GaugeWidget.tsx            ← SVG arco com agulha
      PieChartSVG.tsx
      BarChartSVG.tsx            ← com tooltip on hover
      DotsChartSVG.tsx
      SeasonalsBars.tsx          ← grid 12 meses
      SeasonalsOverlay.tsx       ← curvas sobrepostas 5 anos
      NewsItem.tsx
      IdeaCard.tsx
      PivotsTable.tsx
      IndicatorRow.tsx
      AboutCard.tsx
      SkeletonCard.tsx           ← shimmer wrapper
  lib/
    stockApi.ts                  ← fetchOverview, fetchFinancials, ...
    useStockData.ts              ← hook com sessionCache
```

### 6.2 Carregamento progressivo

```ts
// StockDetail.tsx
const sessionCache = useRef<Map<string, any>>(new Map())

function loadTab(tab: TabName) {
  const key = `${ticker}:${tab}`
  if (sessionCache.current.has(key)) return  // já tem
  setLoading(tab, true)
  fetchByTab(ticker, tab).then(data => {
    sessionCache.current.set(key, data)
    setLoading(tab, false)
  })
}

useEffect(() => { loadTab('overview') }, [ticker])  // pre-load no mount
```

Trocar de aba dispara `loadTab(newTab)`. Cache persiste só na sessão (não em localStorage — backend já cacheia).

### 6.3 Gráficos

Todos em **SVG inline manual**, sem dependência nova:
- **PriceChart** (existente, lightweight-charts) reusado em Overview
- **PieChartSVG**: dois ou três arcos (controle acionário, valoração multi-layer)
- **BarChartSVG**: barras verticais com tooltip on hover (crescimento, dividendos, estrutura capital, saúde financeira empilhada)
- **DotsChartSVG**: pontos preenchidos vs vazados (estimativas)
- **GaugeWidget**: arco com agulha rotacionada baseada em score (-1..+1 para venda forte..compra forte)
- **SeasonalsOverlay**: 5 curvas finas + 1 curva grossa (média), com gradient fill embaixo da média

Tooltip pattern: `onMouseMove` no SVG → calcula índice mais próximo do mouse → mostra `<div>` absoluto posicionado, com `pointer-events: none`.

### 6.4 Interações específicas

| Elemento | Interação |
|---|---|
| Item de notícia (panel News + preview no Overview) | Click abre `url` em nova aba (`window.open(url, '_blank')`) |
| Idea card (Comunidade FinSwarm) | Click abre `HistoryModal` existente passando `jobId` |
| Card de gráfico de barra/linha | Hover mostra tooltip com (rótulo, valor) |
| Botão CTA "Analisar com FinSwarm" | Posicionado sticky no rodapé, chama `postAnalyze` existente |
| Tabs | Click troca panel e scroll to top |
| Sub-tabs em Finanças | Click troca sub-painel internamente |

### 6.5 Estética glass + blobs

- Background fixo no `App.tsx` (já existe) — manter os 3 blobs atuais
- Página `StockDetail` adiciona mais 1 blob acentuando o topo (Solar Flare)
- Todos os cards: `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(20px) saturate(140%); border-radius: 16px`
- Header card e CTA sticky usam variação `glass-strong` (opacity 0.05, blur 24px)
- Cards com acento (CTA, comunidade intro) usam `glass-accent` (Solar Flare tint)

Tokens e classes adicionados ao `web/src/index.css` reaproveitando `@theme` do Tailwind v4 já existente.

### 6.6 Skeleton loaders

Componente `SkeletonCard` com shimmer (gradient animado de slate→solar→slate). Cada panel renderiza N skeletons (parametrizado) enquanto `loading=true`. Largura segue o layout final pra evitar CLS.

## 7. Plano de testes

### 7.1 Backend (`tests/`)

| Arquivo | Cobre |
|---|---|
| `test_cache.py` | get_or_fetch hierarquia memória→SQLite→fetcher; TTL expira; serialização gzip |
| `test_stock_overview.py` | shape de `/stock/X/overview` com yfinance mockado; cache hit em 2ª chamada |
| `test_stock_financials.py` | idem para `/financials` |
| `test_stock_news.py` | paginação por cursor; sentimento cacheado por hash do título |
| `test_stock_technicals.py` | shape de `/technicals` |
| `test_stock_forecast.py` | shape de `/forecast` |
| `test_stock_seasonals.py` | shape e agregação de 5 anos |
| `test_technicals_calc.py` | golden tests: RSI, MACD, SMA, pivôs com OHLCV fixo conhecido batem com valores esperados |
| `test_sentiment.py` | classificação batch via LLMClient mockado; cache permanente por hash |

Mock pattern: `unittest.mock.patch('yfinance.Ticker')` retornando MagicMock com `fast_info`, `info`, `history`, etc. configurados. Fixtures de OHLCV reais (CSV pequeno) para os golden tests de técnicos.

### 7.2 Frontend (`web/src/test/`)

| Arquivo | Cobre |
|---|---|
| `StockDetail.test.tsx` | header + tabs renderizam; troca de aba dispara fetch correto; cache de sessão evita refetch |
| `OverviewPanel.test.tsx` | skeleton durante loading; renderiza KPIs+perfil+sazonais |
| `FinancialsPanel.test.tsx` | sub-tabs internas funcionam |
| `NewsPanel.test.tsx` | item de notícia clicável; abre URL externa |
| `CommunityPanel.test.tsx` | filtra por ticker; clicar abre HistoryModal |
| `TechnicalsPanel.test.tsx` | gauge mostra label correto baseado em counts |
| `ForecastPanel.test.tsx` | tabelas EPS/Receita renderizam |
| `SeasonalsPanel.test.tsx` | curvas + média renderizam |
| `BondsPanel.test.tsx` | mostra placeholder "em breve" |
| Widgets (`KPICard`, `GaugeWidget`, etc.) | smoke test: renderiza com props típicas sem crashar |

Mock: `vi.spyOn(window, 'fetch')` retornando JSON fake. Sem MSW (consistência com testes atuais).

**Coverage alvo**:
- 100% nos cálculos puros (`src/technicals.py`, `src/cache.py`, agregação de sazonais)
- ~70% nos panels (golden path + erro)
- 0% em CSS puro

## 8. Mudanças em código existente

- `src/api.py`: adicionar import + registro dos 6 endpoints novos; estender `/analyses` com `?ticker=` opcional
- `src/db.py`: adicionar filtro `ticker` em `list_analyses`; nova `init_cache_db()` chamada no `lifespan`
- `src/models.py`: adicionar response models novos (não tocar nos existentes)
- `pyproject.toml`: adicionar `cachetools = "^5.3"` (única dep nova no backend)
- `web/vite.config.ts`: adicionar proxy `/stock` → backend
- `web/src/App.tsx`: rota `/stock/:ticker` já aponta para `StockDetail` (manter)
- `web/src/pages/StockDetail.tsx`: **reescrita completa** (a versão atual é minimal)
- `web/src/index.css`: adicionar classes `.glass`, `.glass-strong`, `.glass-accent`, `.shimmer` (algumas já existem)
- `web/src/lib/api.ts`: manter `fetchQuote` existente; novos fetchers vão para `web/src/lib/stockApi.ts`
- `web/src/components/CompanyLogo.tsx`, `PriceChart.tsx`, `HistoryModal.tsx`: **reusados sem mudança**

## 9. Open questions / future work

- **Aba Títulos**: integração com Anbima ou B3 (paga) — fora do MVP, placeholder "em breve" por enquanto
- **WS streaming de preço**: atualização em tempo real do header (sem reload) — fora do MVP
- **Refresh manual**: botão "atualizar" no header invalidaria cache do ticker — fora do MVP
- **Comparação multi-ticker**: side-by-side overview de PETR4 vs VALE3 — não solicitado
- **Exportar PDF**: gerar relatório da `StockDetail` — não solicitado
- **Mobile**: layout colapsa para 1 coluna abaixo de 768px — não no MVP

## 10. Critérios de aceitação

- [ ] Acessar `/stock/PETR4` mostra o header com preço em < 1s, overview com skeleton, conteúdo completo em < 5s (com cache frio); < 500ms com cache quente
- [ ] 8 abas estão visíveis na barra; 7 carregam dados reais; "Títulos" mostra placeholder
- [ ] Trocar de aba pela primeira vez mostra skeleton, segunda vez é instantâneo (cache de sessão)
- [ ] Clicar numa notícia abre a URL em nova aba
- [ ] Clicar num card de Comunidade FinSwarm abre o `HistoryModal` com a análise completa
- [ ] Gráficos de barras/linha mostram tooltip ao passar o mouse
- [ ] CTA "Analisar com FinSwarm" continua funcionando (chama `postAnalyze` + navega para `/analysis/:jobId`)
- [ ] Todos os testes existentes continuam verdes; novos testes (~25 frontend + ~10 backend) passam
- [ ] `npm run build` verde; `poetry run pytest` verde
- [ ] Estética glass + blobs aplicada conforme mockup `tabs-v2.html`
