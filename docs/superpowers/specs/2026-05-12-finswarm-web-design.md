# FinSwarm Web — Design Spec

**Data:** 2026-05-12
**Stack:** Vite + React + TypeScript + Tailwind v4
**Localização:** `~/finswarm/web/` (subdiretório do projeto FinSwarm)
**Visual:** segue `style.md` na raiz do repo (Slash — Midnight Ledger, Obsidian Surfaces)

---

## Objetivo

Frontend MVP para o FinSwarm. Permite ao usuário submeter um ticker da B3, acompanhar em tempo real a execução dos 7 agentes via WebSocket, e visualizar o relatório final com recomendação (COMPRAR / MANTER / VENDER), confiança, score de risco, stop-loss sugerido e o output detalhado de cada agente.

---

## Decisões de Arquitetura

### Stack: Vite + React + Tailwind v4

Escolhido sobre Next.js e Streamlit. O app é puramente client-side, sem SEO ou rotas dinâmicas no servidor — não há ganho com SSR. Streamlit foi descartado porque inviabilizaria o sistema de design (Tailwind v4 + Inter + Ivy Presto + tokens custom). Vite oferece dev server rápido, HMR e build leve.

### Subdiretório `web/` do mesmo repo

Mantém backend e frontend no mesmo repositório. Em dev, o Vite usa proxy para `http://localhost:8000` (FastAPI), evitando CORS local complexo. O backend ganha apenas um `CORSMiddleware` permitindo origin do Vite — nenhuma mudança funcional.

### Sem persistência no MVP

O estado da análise vive apenas no React state da página `/analysis/:jobId` e no `_jobs` em memória do backend (que já existe). Recarregar a página perde o job. Aceitável para MVP — persistência exigiria DB no backend, que está fora do escopo da v1.

### Tailwind v4 com tokens do style.md

`style.md` já define o bloco `@theme` para Tailwind v4. Copiar direto para `web/src/index.css`. Inter via Google Fonts; Ivy Presto substituído por Playfair Display (substituto oficial declarado no design system).

### Comunicação backend: REST + WebSocket existentes

A API atual (`POST /analyze` + `WebSocket /ws/{job_id}` + `GET /health`) é suficiente. Não adicionar endpoints novos.

---

## Estrutura de Diretórios

```
finswarm/
├── web/
│   ├── src/
│   │   ├── App.tsx                  # Router (Home + /analysis/:jobId)
│   │   ├── main.tsx
│   │   ├── index.css                # @theme tailwind + tokens style.md + Google Fonts
│   │   ├── pages/
│   │   │   ├── Home.tsx             # Hero + TickerInput
│   │   │   └── Analysis.tsx         # Timeline + Report
│   │   ├── components/
│   │   │   ├── TickerInput.tsx      # Pill Input + Pill Primary Button
│   │   │   ├── AgentTimeline.tsx    # Lista vertical dos 7 agentes
│   │   │   ├── AgentTimelineItem.tsx
│   │   │   ├── ReportHero.tsx       # Recomendação + scores
│   │   │   ├── AgentCard.tsx        # Card expandível por agente
│   │   │   ├── ErrorBanner.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx       # Pill Primary + Pill Ghost + Sharp Ghost
│   │   │       ├── Card.tsx         # Card Standard / Slate Gray
│   │   │       └── Badge.tsx        # Status indicator
│   │   ├── lib/
│   │   │   ├── api.ts               # postAnalyze(ticker) -> JobStatus
│   │   │   ├── useAnalysis.ts       # Hook: WS + estado consolidado
│   │   │   └── types.ts             # Mirror dos Pydantic models
│   │   └── styles/
│   │       └── tokens.css           # CSS custom properties do style.md
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts               # Proxy /analyze + /ws → :8000
│   └── README.md
├── src/api.py                       # + CORSMiddleware (única mudança backend)
└── ...
```

---

## Telas

### Home (`/`)

Layout centralizado, `max-width: 1216px`, fundo `--color-midnight-ink`.

- **Headline:** Ivy Presto 88px (`--text-display`), Pure White, "Análise multi-agente para a B3"
- **Subhead:** Inter 20px (`--text-subheading`), Porcelain Text, frase única explicando o propósito
- **TickerInput:**
  - Pill Input transparente com borda Pure White, placeholder "PETR4.SA" em Ash Text
  - Pill Primary Button "Analisar" (Pure White bg, Charcoal Canvas text, radius 9999px)
  - Validação client: regex `^[A-Z]{4}\d{1,2}(\.SA)?$` (case-insensitive, normaliza para upper + sufixo `.SA` se ausente)
- **Submit:**
  - `POST /analyze` com `{ ticker }`
  - On 202: navega para `/analysis/:job_id` via `useNavigate` (React Router)
  - On erro de rede ou 4xx/5xx: ErrorBanner inline acima do input

### Análise (`/analysis/:jobId`)

Layout split em desktop (≥1024px): coluna esquerda 40% (timeline), coluna direita 60% (relatório). Em mobile, stack vertical: timeline acima, relatório abaixo.

**Coluna esquerda — AgentTimeline:**
- 7 itens fixos na ordem: `technical`, `fundamental`, `sentiment`, `bull`, `bear`, `risk`, `synthesis`
- Cada item (AgentTimelineItem):
  - Bolinha de status (8px diameter):
    - `pending`: `--color-stone-text`
    - `running`: `--color-golden-gradient` com pulse animation (CSS `@keyframes`)
    - `ok`: `--color-pure-white`
    - `failed`: `#cc4444` (red dim, tom único fora da paleta — único caso de exceção)
  - Nome do agente em Inter 16px medium, Pure White (rodando/ok) ou Ash Text (pendente)
  - Elapsed em caption 12px, Stone Text ("14.2s")
  - Linha conectora vertical (1px solid Silver Text @ 30% opacity) entre itens

**Coluna direita:**
- Enquanto `result === null`: estado de loading
  - Texto contextual derivado do último `agent_start` ("BullAgent argumentando…", "SynthesisAgent compilando relatório…")
  - Tabela de mapeamento agente → frase em `lib/agentLabels.ts`
- Quando `result !== null`: **ReportHero** seguido de stack vertical de **AgentCard**

**ReportHero:**
- Recomendação em Ivy Presto 64px (`--text-heading-lg` adaptado):
  - `COMPRAR`: Pure White
  - `MANTER`: Porcelain Text
  - `VENDER`: gradient golden (texto com `background-clip: text`)
- 3 stats inline em grid 3-col, cada um com label caption Stone Text + valor body Pure White:
  - Confiança: `${(confidence * 100).toFixed(0)}%`
  - Risco: `${risk_score}/100`
  - Stop loss: `${stop_loss_pct.toFixed(1)}%`
- Ticker e timestamp em caption Ash Text abaixo

**AgentCard (um por agente, 7 cards):**
- Slate Gray bg (`#1c1d22`), radius 10px, padding 32px
- Header sempre visível:
  - Nome do agente em Inter 20px semibold, Pure White
  - Badge de status (ok / failed) à direita
  - Botão chevron para expandir/colapsar (Sharp Ghost)
- Colapsado: mostra apenas `summary` em body Porcelain Text (line-clamp 2)
- Expandido: mostra `summary` completo + bloco monoespaçado com `JSON.stringify(raw, null, 2)` em fonte system mono 13px, Silver Text, bg Pewter Accent, scroll horizontal se necessário

---

## Fluxo do WebSocket

Hook `useAnalysis(jobId: string)`:

```ts
type AnalysisState = {
  agents: Record<AgentName, { status: 'pending' | 'running' | 'ok' | 'failed'; elapsed: number | null }>
  currentAgent: AgentName | null
  result: AnalysisResult | null
  error: string | null
  connectionLost: boolean
}
```

Comportamento:
1. Ao montar, abre WS em `/ws/{jobId}` (em dev, via proxy Vite que reescreve para `ws://localhost:8000`)
2. Inicializa todos os 7 agentes como `pending`
3. Para cada mensagem:
   - `agent_start`: marca aquele agente como `running`, atualiza `currentAgent` e `elapsed`
   - `agent_done`: marca como `ok` (a UI não distingue ok/failed pelo evento — espera o `result` final para saber quais foram `failed`)
   - `done`: salva `result`, marca todos `running` restantes como `ok`, e reconcilia `failed` com `result.agents[name].status`
   - `error`: salva `error`, fecha WS
4. Em `onclose` antes de `done`/`error`: setа `connectionLost = true`
5. Cleanup: fecha WS no unmount

**Reconexão manual:** botão "Tentar novamente" no ErrorBanner reabre o WS com o mesmo `jobId` (o backend ainda mantém a fila enquanto o job roda — o reconnect lê eventos pendentes).

---

## Erros e Edge Cases

| Cenário | Comportamento |
|---------|---------------|
| Validação client falha (ticker inválido) | ErrorBanner inline no Home, não chama API |
| `POST /analyze` retorna 4xx/5xx | ErrorBanner no Home com mensagem do servidor |
| WS fecha antes de `done` | Banner discreto "Conexão interrompida" + botão "Tentar novamente" |
| Evento `error` do WS | ErrorBanner persistente com mensagem, botão "Nova análise" para voltar ao Home |
| Agente individual com `status=failed` no `result.agents` | AgentCard daquele agente fica com badge "falhou" em red dim; ReportHero ainda mostra a recomendação (synthesis lida com dados parciais) |
| Recarregar `/analysis/:jobId` (job expirou ou backend reiniciou) | Tela de erro: "Essa análise expirou" + botão "Nova análise" |
| Job_id inexistente | Backend envia `{event: "error", message: "job_id não encontrado"}` → ErrorBanner |

---

## Mudanças no Backend

Apenas `src/api.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

Nenhuma mudança em rotas, modelos, agentes ou orchestrator.

---

## Configuração Vite

`vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/analyze': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
      '/health': 'http://localhost:8000',
    },
  },
})
```

Em produção (fora do escopo do MVP), variáveis `VITE_API_URL` e `VITE_WS_URL` poderiam apontar para o backend real — mas isso é v2.

---

## Tipos TypeScript (mirror dos Pydantic)

```ts
// lib/types.ts
export type AgentName = 'technical' | 'fundamental' | 'sentiment'
  | 'bull' | 'bear' | 'risk' | 'synthesis'

export type Recommendation = 'COMPRAR' | 'MANTER' | 'VENDER'

export interface AgentOutput {
  status: 'ok' | 'failed'
  summary: string
  raw: Record<string, unknown>
}

export interface AnalysisResult {
  job_id: string
  ticker: string
  timestamp: string
  recommendation: Recommendation
  confidence: number
  risk_score: number
  stop_loss_pct: number
  agents: Record<AgentName, AgentOutput>
  elapsed_seconds: number
  cost_usd: number
}

export interface JobStatus {
  job_id: string
  ticker: string
  status: 'running' | 'done' | 'failed'
}

export type WsEvent =
  | { event: 'agent_start'; agent: AgentName; elapsed: number }
  | { event: 'agent_done'; agent: AgentName; elapsed: number }
  | { event: 'done'; result: AnalysisResult; elapsed: number }
  | { event: 'error'; message: string }
```

---

## Dependências

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "jsdom": "^25.0.0",
    "mock-socket": "^9.3.0"
  }
}
```

Sem libs de UI (shadcn etc.) — componentes feitos à mão seguindo style.md para fidelidade visual total.

---

## Testes

- **Componentes** (Vitest + RTL):
  - `TickerInput`: valida regex, dispara onSubmit com ticker normalizado
  - `AgentTimeline`: renderiza 7 itens, aplica classe de status correta
  - `ReportHero`: aplica cor correta por recomendação, formata stats
  - `AgentCard`: alterna estado expandido, mostra raw quando expandido
- **Hook** (Vitest + mock-socket):
  - `useAnalysis`: simula sequência completa de eventos WS, verifica state após cada evento
  - Testa cenário de close prematuro
- **Sem testes E2E** no MVP. O backend já tem `test_full_analysis_petr4` cobrindo o fluxo. Testar a integração visual fica para v2.

---

## Fora do Escopo (v1)

- Histórico de análises
- Autenticação / multi-usuário
- Comparação entre tickers
- Export PDF / share image
- Deploy (Vercel, Netlify, etc.)
- i18n (UI fixa em PT-BR)
- Tema claro
- Tela de configurações
- Animações elaboradas (apenas pulse no agente rodando)

---

## Emendas — Evolução pós-spec (2026-05-13)

> Esta seção registra decisões tomadas após a spec original. A fonte de verdade visual atual é `style.md` (v2).

### Visual Overhaul v2 — Solar Flare palette

O design system original (v1 "Slash / Midnight Ledger", fundos `#030303`–`#0B0B0B`, acento `#35C78A`) foi substituído pelo v2 "Dovetail / Solar Command Center":

| Antes (v1) | Depois (v2) |
|------------|-------------|
| Fundo `#030303`–`#0B0B0B` | Fundo `#131313` / `#1a1a1a` |
| Acento `#35C78A` Emerald | Solar Flare `#ffa16c` (marca), Cosmic Blue `#479ffa` (interativo) |
| Texto `rgba(255,255,255,0.94)` | Texto Smoke `#e6e6e6` (h1), Silver `#cccccc` (corpo) |
| Negative `#D95C68` | Negative `#e05454` |
| Warning `#E79A73` | Warn `#e9a84a` |
| Fonte Inter pura | Inter (interface) + JetBrains Mono (dados) |

### Componentes adicionados após spec

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `CompanyLogo` | `components/CompanyLogo.tsx` | Favicon real via Google Favicons + fallback iniciais |
| `StockQuickPicks` | `components/StockQuickPicks.tsx` | Grid 5×2 das 10 principais ações B3 |
| `PriceChart` | `components/PriceChart.tsx` | Gráfico TradingView lightweight-charts v4, AreaSeries |
| `AgentBento` | `components/AgentBento.tsx` | Bento grid 3 colunas, 7 cards visuais |

### Mudanças em componentes existentes

**`ReportHero`** — refatorado para layout Magazine: recomendação Solar Flare grande, `PriceChart` integrado, 3 cards de métrica abaixo.

**`AgentCard`** — mantido apenas para compatibilidade com testes legados. Em produção, substituído por `AgentBento`.

**`HistoryModal`** — deixou de ser overlay modal para se comportar como tela cheia (`position: fixed, inset: 0, background: #131313`). Fecha exclusivamente via botão "← Voltar" (sem ESC, sem click no backdrop). Layout 2 colunas: ReportHero sticky (380px) + AgentBento (1fr).

### Persistência (adicionado em 2026-05-13)

Funcionalidade fora do escopo v1 foi implementada:
- `src/db.py` — SQLite via aiosqlite
- `data/analyses.db` — criado automaticamente no lifespan FastAPI
- `GET /analyses` e `GET /analyses/{job_id}` — endpoints REST
- `HistoryDrawer` — painel lateral permanente na Home
- `HistoryModal` — visualização completa de análise histórica

### Backend — endpoint de gráfico (adicionado em 2026-05-13)

```python
GET /chart/{ticker}?period=3mo&interval=1d
# → list[{time, open, high, low, close, volume}]
# via yfinance
```

Proxy adicionado no `vite.config.ts`: `'/chart': 'http://localhost:8000'`.
