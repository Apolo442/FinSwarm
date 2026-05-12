# FinSwarm Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o frontend MVP do FinSwarm (Vite + React + Tailwind v4) que permite submeter um ticker, acompanhar via WebSocket os 7 agentes em tempo real, e exibir o relatório final seguindo o sistema visual `DESIGN.md`.

**Architecture:** SPA cliente em `~/finswarm/web/` com 2 rotas (Home `/` e Análise `/analysis/:jobId`). Comunica via REST (POST /analyze) + WebSocket (/ws/{job_id}) com o backend FastAPI existente. Vite dev server faz proxy para `localhost:8000`, sem CORS em dev; o backend ganha apenas um `CORSMiddleware` para suportar acessos diretos do browser.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind v4 (`@tailwindcss/vite`), React Router 6, Vitest + React Testing Library, mock-socket para testar WS.

---

## File Structure

```
finswarm/
├── src/api.py                          # MODIFY: + CORSMiddleware
└── web/                                # NEW
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── .gitignore
    ├── README.md
    └── src/
        ├── main.tsx                    # bootstrap React
        ├── App.tsx                     # router
        ├── index.css                   # @theme tailwind + tokens + fonts
        ├── pages/
        │   ├── Home.tsx
        │   └── Analysis.tsx
        ├── components/
        │   ├── TickerInput.tsx
        │   ├── AgentTimeline.tsx
        │   ├── AgentTimelineItem.tsx
        │   ├── ReportHero.tsx
        │   ├── AgentCard.tsx
        │   ├── ErrorBanner.tsx
        │   └── ui/
        │       ├── Button.tsx
        │       ├── Card.tsx
        │       └── Badge.tsx
        ├── lib/
        │   ├── api.ts
        │   ├── useAnalysis.ts
        │   ├── agentLabels.ts
        │   └── types.ts
        └── test/
            ├── setup.ts
            ├── TickerInput.test.tsx
            ├── AgentTimeline.test.tsx
            ├── ReportHero.test.tsx
            ├── AgentCard.test.tsx
            └── useAnalysis.test.ts
```

---

## Task 1: Bootstrap do projeto Vite

**Files:**
- Create: `web/package.json`
- Create: `web/index.html`
- Create: `web/tsconfig.json`
- Create: `web/tsconfig.node.json`
- Create: `web/vite.config.ts`
- Create: `web/.gitignore`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`

- [ ] **Step 1: Criar `web/package.json`**

```json
{
  "name": "finswarm-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "mock-socket": "^9.3.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.6",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Criar `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Criar `web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Criar `web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/analyze': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 5: Criar `web/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FinSwarm — Análise multi-agente para a B3</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Criar `web/.gitignore`**

```
node_modules
dist
.vite
*.local
```

- [ ] **Step 7: Criar `web/src/main.tsx` e `web/src/App.tsx` placeholders mínimos**

`web/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

`web/src/App.tsx`:
```tsx
export default function App() {
  return <div>FinSwarm Web — bootstrap OK</div>
}
```

- [ ] **Step 8: Criar `web/src/index.css` mínimo (será preenchido na Task 2)**

```css
/* placeholder - will be populated in Task 2 */
```

- [ ] **Step 9: Instalar dependências e validar bootstrap**

Run:
```bash
cd ~/finswarm/web && npm install
```
Expected: instalação sem erros.

Run:
```bash
cd ~/finswarm/web && npm run build
```
Expected: build sem erros, `dist/` criado.

- [ ] **Step 10: Commit**

```bash
cd ~/finswarm
git add web/
git commit -m "feat(web): bootstrap Vite + React + TypeScript project"
```

---

## Task 2: Tokens do DESIGN.md e Tailwind v4

**Files:**
- Modify: `web/src/index.css`

- [ ] **Step 1: Substituir `web/src/index.css` com `@theme` completo do DESIGN.md**

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-midnight-ink: #000000;
  --color-obsidian-surface: #030304;
  --color-charcoal-canvas: #08080a;
  --color-pewter-accent: #121317;
  --color-slate-gray: #1c1d22;
  --color-ash-text: #5e616e;
  --color-stone-text: #777a88;
  --color-silver-text: #acafb9;
  --color-porcelain-text: #cdcdcd;
  --color-white-frost: #e2e3e9;
  --color-pure-white: #ffffff;
  --color-golden: #cc9166;
  --color-status-failed: #cc4444;

  /* Typography */
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-ivy: 'Playfair Display', 'Ivy Presto', ui-serif, Georgia, serif;

  --text-caption: 12px;
  --text-body-sm: 14px;
  --text-body: 16px;
  --text-subheading: 20px;
  --text-heading: 32px;
  --text-heading-lg: 48px;
  --text-display: 88px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-105: 105px;
  --spacing-224: 224px;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-md: 10px;
  --radius-pill: 9999px;
}

:root {
  --gradient-golden: linear-gradient(103deg, rgb(174, 147, 87), rgb(255, 240, 204) 40%, rgb(174, 147, 87) 70%, rgba(189, 157, 79, 0));
}

html, body, #root {
  height: 100%;
}

body {
  margin: 0;
  background-color: var(--color-midnight-ink);
  color: var(--color-white-frost);
  font-family: var(--font-inter);
  font-size: var(--text-body);
  line-height: 1.38;
  letter-spacing: -0.02px;
  -webkit-font-smoothing: antialiased;
}

@keyframes pulse-golden {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(204, 145, 102, 0.5); }
  50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(204, 145, 102, 0); }
}

.animate-pulse-golden {
  animation: pulse-golden 1.6s ease-in-out infinite;
}
```

- [ ] **Step 2: Validar que o dev server sobe e o body fica preto**

Run em terminal separado:
```bash
cd ~/finswarm/web && npm run dev
```
Expected: server em `http://localhost:5173`. Abrir no browser deve mostrar "FinSwarm Web — bootstrap OK" em texto claro sobre fundo preto. Encerrar o server com Ctrl+C após validar.

- [ ] **Step 3: Commit**

```bash
cd ~/finswarm
git add web/src/index.css
git commit -m "feat(web): apply DESIGN.md tokens via Tailwind v4 @theme"
```

---

## Task 3: Tipos compartilhados e labels de agentes

**Files:**
- Create: `web/src/lib/types.ts`
- Create: `web/src/lib/agentLabels.ts`

- [ ] **Step 1: Criar `web/src/lib/types.ts`**

```ts
export const AGENT_ORDER = [
  'technical',
  'fundamental',
  'sentiment',
  'bull',
  'bear',
  'risk',
  'synthesis',
] as const

export type AgentName = (typeof AGENT_ORDER)[number]

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

export type AgentStatus = 'pending' | 'running' | 'ok' | 'failed'

export interface AgentState {
  status: AgentStatus
  elapsed: number | null
}
```

- [ ] **Step 2: Criar `web/src/lib/agentLabels.ts`**

```ts
import type { AgentName } from './types'

export const AGENT_LABELS: Record<AgentName, string> = {
  technical: 'Análise técnica',
  fundamental: 'Análise fundamentalista',
  sentiment: 'Sentimento de mercado',
  bull: 'Argumentação de alta',
  bear: 'Argumentação de baixa',
  risk: 'Avaliação de risco',
  synthesis: 'Síntese final',
}

export const AGENT_RUNNING_PHRASES: Record<AgentName, string> = {
  technical: 'Lendo indicadores técnicos…',
  fundamental: 'Avaliando fundamentos da empresa…',
  sentiment: 'Processando notícias recentes…',
  bull: 'Construindo argumentos de alta…',
  bear: 'Construindo argumentos de baixa…',
  risk: 'Calculando risco e stop-loss…',
  synthesis: 'Compilando o relatório final…',
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/finswarm
git add web/src/lib/types.ts web/src/lib/agentLabels.ts
git commit -m "feat(web): add shared types and agent labels"
```

---

## Task 4: Setup de testes

**Files:**
- Create: `web/src/test/setup.ts`

- [ ] **Step 1: Criar `web/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 2: Rodar suite vazia para validar config**

Run:
```bash
cd ~/finswarm/web && npm test
```
Expected: "No test files found" ou similar, sem erro de config.

- [ ] **Step 3: Commit**

```bash
cd ~/finswarm
git add web/src/test/setup.ts
git commit -m "test(web): add vitest setup with testing-library"
```

---

## Task 5: Componentes UI primitivos (Button, Card, Badge)

**Files:**
- Create: `web/src/components/ui/Button.tsx`
- Create: `web/src/components/ui/Card.tsx`
- Create: `web/src/components/ui/Badge.tsx`

- [ ] **Step 1: Criar `web/src/components/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'sharp'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-pure-white text-charcoal-canvas rounded-pill px-8 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-pure-white border border-pure-white rounded-pill px-4 py-1.5 hover:bg-pure-white/10 transition-colors',
  sharp:
    'bg-transparent text-pure-white rounded-sm px-2 hover:bg-pure-white/10 transition-colors',
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Criar `web/src/components/ui/Card.tsx`**

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`bg-slate-gray rounded-md p-8 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Criar `web/src/components/ui/Badge.tsx`**

```tsx
import type { ReactNode } from 'react'

type Tone = 'ok' | 'failed' | 'neutral'

interface BadgeProps {
  tone: Tone
  children: ReactNode
}

const TONE_CLASSES: Record<Tone, string> = {
  ok: 'bg-pure-white/10 text-pure-white',
  failed: 'bg-status-failed/20 text-status-failed',
  neutral: 'bg-pewter-accent text-silver-text',
}

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/finswarm
git add web/src/components/ui/
git commit -m "feat(web): add Button, Card, Badge primitives"
```

---

## Task 6: TickerInput com validação (TDD)

**Files:**
- Create: `web/src/components/TickerInput.tsx`
- Create: `web/src/test/TickerInput.test.tsx`

- [ ] **Step 1: Escrever testes que falham**

`web/src/test/TickerInput.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TickerInput } from '../components/TickerInput'

describe('TickerInput', () => {
  it('chama onSubmit com ticker normalizado para uppercase + .SA', async () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} />)
    const input = screen.getByPlaceholderText('PETR4.SA')
    await userEvent.type(input, 'petr4')
    await userEvent.click(screen.getByRole('button', { name: /analisar/i }))
    expect(onSubmit).toHaveBeenCalledWith('PETR4.SA')
  })

  it('aceita ticker que já vem com .SA', async () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByPlaceholderText('PETR4.SA'), 'VALE3.SA')
    await userEvent.click(screen.getByRole('button', { name: /analisar/i }))
    expect(onSubmit).toHaveBeenCalledWith('VALE3.SA')
  })

  it('mostra erro inline e não chama onSubmit quando ticker inválido', async () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByPlaceholderText('PETR4.SA'), 'XX')
    await userEvent.click(screen.getByRole('button', { name: /analisar/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/ticker inválido/i)).toBeInTheDocument()
  })

  it('respeita prop disabled', () => {
    render(<TickerInput onSubmit={vi.fn()} disabled />)
    expect(screen.getByRole('button', { name: /analisar/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Rodar testes (esperar FALHA)**

Run: `cd ~/finswarm/web && npm test -- TickerInput`
Expected: FAIL — `TickerInput` não existe.

- [ ] **Step 3: Implementar `web/src/components/TickerInput.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { Button } from './ui/Button'

interface TickerInputProps {
  onSubmit: (ticker: string) => void
  disabled?: boolean
}

const TICKER_REGEX = /^[A-Z]{4}\d{1,2}(\.SA)?$/

function normalize(raw: string): string | null {
  const upper = raw.trim().toUpperCase()
  if (!TICKER_REGEX.test(upper)) return null
  return upper.endsWith('.SA') ? upper : `${upper}.SA`
}

export function TickerInput({ onSubmit, disabled = false }: TickerInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = normalize(value)
    if (!normalized) {
      setError('Ticker inválido. Use o formato PETR4 ou PETR4.SA.')
      return
    }
    setError(null)
    onSubmit(normalized)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xl">
      <div className="flex gap-3 w-full">
        <input
          type="text"
          placeholder="PETR4.SA"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          aria-label="Ticker"
          className="flex-1 bg-transparent text-pure-white border border-pure-white rounded-pill px-5 py-2.5 placeholder:text-ash-text focus:outline-none focus:border-golden disabled:opacity-50"
        />
        <Button type="submit" disabled={disabled}>
          Analisar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-failed">
          {error}
        </p>
      )}
    </form>
  )
}
```

- [ ] **Step 4: Rodar testes (esperar PASS)**

Run: `cd ~/finswarm/web && npm test -- TickerInput`
Expected: 4 testes passando.

- [ ] **Step 5: Commit**

```bash
cd ~/finswarm
git add web/src/components/TickerInput.tsx web/src/test/TickerInput.test.tsx
git commit -m "feat(web): TickerInput with normalization and validation"
```

---

## Task 7: Cliente da API (postAnalyze)

**Files:**
- Create: `web/src/lib/api.ts`

- [ ] **Step 1: Criar `web/src/lib/api.ts`**

```ts
import type { JobStatus } from './types'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function postAnalyze(ticker: string): Promise<JobStatus> {
  const response = await fetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
  })
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body)
    } catch {
      /* keep statusText */
    }
    throw new ApiError(response.status, detail)
  }
  return (await response.json()) as JobStatus
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/finswarm
git add web/src/lib/api.ts
git commit -m "feat(web): add API client for POST /analyze"
```

---

## Task 8: Hook `useAnalysis` (TDD com mock-socket)

**Files:**
- Create: `web/src/lib/useAnalysis.ts`
- Create: `web/src/test/useAnalysis.test.ts`

- [ ] **Step 1: Escrever testes que falham**

`web/src/test/useAnalysis.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { WebSocket as MockWebSocket, Server } from 'mock-socket'
import { useAnalysis } from '../lib/useAnalysis'
import type { AnalysisResult } from '../lib/types'

const WS_URL = 'ws://localhost/ws/abc123'

const originalWebSocket = globalThis.WebSocket

beforeEach(() => {
  // @ts-expect-error mock-socket WebSocket has slightly different signature
  globalThis.WebSocket = MockWebSocket
})

afterEach(() => {
  globalThis.WebSocket = originalWebSocket
})

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    job_id: 'abc123',
    ticker: 'PETR4.SA',
    timestamp: '2026-05-12T12:00:00Z',
    recommendation: 'COMPRAR',
    confidence: 0.78,
    risk_score: 42,
    stop_loss_pct: 5.0,
    agents: {
      technical: { status: 'ok', summary: 's', raw: {} },
      fundamental: { status: 'ok', summary: 's', raw: {} },
      sentiment: { status: 'ok', summary: 's', raw: {} },
      bull: { status: 'ok', summary: 's', raw: {} },
      bear: { status: 'ok', summary: 's', raw: {} },
      risk: { status: 'ok', summary: 's', raw: {} },
      synthesis: { status: 'ok', summary: 's', raw: {} },
    },
    elapsed_seconds: 540,
    cost_usd: 0,
    ...overrides,
  }
}

describe('useAnalysis', () => {
  it('inicializa todos os 7 agentes como pending', () => {
    const server = new Server(WS_URL)
    const { result } = renderHook(() => useAnalysis('abc123'))
    expect(result.current.agents.technical.status).toBe('pending')
    expect(result.current.agents.synthesis.status).toBe('pending')
    expect(result.current.result).toBeNull()
    server.close()
  })

  it('marca agente como running em agent_start', async () => {
    const server = new Server(WS_URL)
    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'agent_start', agent: 'technical', elapsed: 0 }))
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.agents.technical.status).toBe('running')
      expect(result.current.currentAgent).toBe('technical')
    })
    server.close()
  })

  it('marca agente como ok em agent_done', async () => {
    const server = new Server(WS_URL)
    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'agent_start', agent: 'technical', elapsed: 0 }))
      socket.send(JSON.stringify({ event: 'agent_done', agent: 'technical', elapsed: 14.2 }))
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.agents.technical.status).toBe('ok')
      expect(result.current.agents.technical.elapsed).toBe(14.2)
    })
    server.close()
  })

  it('salva result em done e reconcilia status failed', async () => {
    const server = new Server(WS_URL)
    const finalResult = makeResult({
      agents: {
        ...makeResult().agents,
        sentiment: { status: 'failed', summary: 'falhou', raw: {} },
      },
    })
    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'done', result: finalResult, elapsed: 540 }))
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.result).not.toBeNull()
      expect(result.current.agents.sentiment.status).toBe('failed')
    })
    server.close()
  })

  it('seta error em evento error', async () => {
    const server = new Server(WS_URL)
    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'error', message: 'job_id não encontrado' }))
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.error).toBe('job_id não encontrado')
    })
    server.close()
  })

  it('seta connectionLost quando WS fecha antes de done', async () => {
    const server = new Server(WS_URL)
    server.on('connection', (socket) => {
      socket.close()
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => {
      expect(result.current.connectionLost).toBe(true)
    })
    server.close()
  })

  it('reconnect zera connectionLost e reabre WS', async () => {
    const server = new Server(WS_URL)
    let connectionCount = 0
    server.on('connection', (socket) => {
      connectionCount++
      if (connectionCount === 1) socket.close()
    })
    const { result } = renderHook(() => useAnalysis('abc123'))
    await waitFor(() => expect(result.current.connectionLost).toBe(true))
    act(() => {
      result.current.reconnect()
    })
    await waitFor(() => {
      expect(connectionCount).toBe(2)
      expect(result.current.connectionLost).toBe(false)
    })
    server.close()
  })
})
```

- [ ] **Step 2: Rodar testes (esperar FALHA)**

Run: `cd ~/finswarm/web && npm test -- useAnalysis`
Expected: FAIL — `useAnalysis` não existe.

- [ ] **Step 3: Implementar `web/src/lib/useAnalysis.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AGENT_ORDER,
  type AgentName,
  type AgentState,
  type AnalysisResult,
  type WsEvent,
} from './types'

interface UseAnalysisState {
  agents: Record<AgentName, AgentState>
  currentAgent: AgentName | null
  result: AnalysisResult | null
  error: string | null
  connectionLost: boolean
}

interface UseAnalysisReturn extends UseAnalysisState {
  reconnect: () => void
}

function initialAgents(): Record<AgentName, AgentState> {
  return AGENT_ORDER.reduce((acc, name) => {
    acc[name] = { status: 'pending', elapsed: null }
    return acc
  }, {} as Record<AgentName, AgentState>)
}

function initialState(): UseAnalysisState {
  return {
    agents: initialAgents(),
    currentAgent: null,
    result: null,
    error: null,
    connectionLost: false,
  }
}

function buildWsUrl(jobId: string): string {
  if (typeof window === 'undefined') {
    return `ws://localhost/ws/${jobId}`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/${jobId}`
}

export function useAnalysis(jobId: string): UseAnalysisReturn {
  const [state, setState] = useState<UseAnalysisState>(initialState)
  const [generation, setGeneration] = useState(0)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(buildWsUrl(jobId))
    socketRef.current = ws
    let doneOrError = false

    ws.onmessage = (msg) => {
      let parsed: WsEvent
      try {
        parsed = JSON.parse(msg.data) as WsEvent
      } catch {
        return
      }
      setState((prev) => {
        switch (parsed.event) {
          case 'agent_start':
            return {
              ...prev,
              currentAgent: parsed.agent,
              agents: {
                ...prev.agents,
                [parsed.agent]: { status: 'running', elapsed: parsed.elapsed },
              },
            }
          case 'agent_done':
            return {
              ...prev,
              agents: {
                ...prev.agents,
                [parsed.agent]: { status: 'ok', elapsed: parsed.elapsed },
              },
            }
          case 'done': {
            doneOrError = true
            const reconciled = { ...prev.agents }
            for (const name of AGENT_ORDER) {
              const agentOutput = parsed.result.agents[name]
              const finalStatus = agentOutput?.status === 'failed' ? 'failed' : 'ok'
              reconciled[name] = {
                status: finalStatus,
                elapsed: reconciled[name].elapsed,
              }
            }
            return {
              ...prev,
              agents: reconciled,
              currentAgent: null,
              result: parsed.result,
            }
          }
          case 'error':
            doneOrError = true
            return { ...prev, error: parsed.message }
          default:
            return prev
        }
      })
    }

    ws.onclose = () => {
      if (!doneOrError) {
        setState((prev) => ({ ...prev, connectionLost: true }))
      }
    }

    return () => {
      ws.close()
    }
  }, [jobId, generation])

  const reconnect = useCallback(() => {
    setState((prev) => ({ ...prev, connectionLost: false, error: null }))
    setGeneration((g) => g + 1)
  }, [])

  return { ...state, reconnect }
}
```

- [ ] **Step 4: Rodar testes (esperar PASS)**

Run: `cd ~/finswarm/web && npm test -- useAnalysis`
Expected: 7 testes passando.

- [ ] **Step 5: Commit**

```bash
cd ~/finswarm
git add web/src/lib/useAnalysis.ts web/src/test/useAnalysis.test.ts
git commit -m "feat(web): useAnalysis hook with WebSocket state machine"
```

---

## Task 9: AgentTimeline + AgentTimelineItem (TDD)

**Files:**
- Create: `web/src/components/AgentTimelineItem.tsx`
- Create: `web/src/components/AgentTimeline.tsx`
- Create: `web/src/test/AgentTimeline.test.tsx`

- [ ] **Step 1: Escrever testes que falham**

`web/src/test/AgentTimeline.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentTimeline } from '../components/AgentTimeline'
import { AGENT_ORDER, type AgentState, type AgentName } from '../lib/types'

function makeAgents(overrides: Partial<Record<AgentName, AgentState>> = {}): Record<AgentName, AgentState> {
  const base = AGENT_ORDER.reduce((acc, n) => {
    acc[n] = { status: 'pending', elapsed: null }
    return acc
  }, {} as Record<AgentName, AgentState>)
  return { ...base, ...overrides }
}

describe('AgentTimeline', () => {
  it('renderiza os 7 agentes na ordem correta', () => {
    render(<AgentTimeline agents={makeAgents()} />)
    expect(screen.getByText('Análise técnica')).toBeInTheDocument()
    expect(screen.getByText('Síntese final')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(7)
  })

  it('mostra elapsed quando disponível', () => {
    render(
      <AgentTimeline agents={makeAgents({ technical: { status: 'ok', elapsed: 14.2 } })} />
    )
    expect(screen.getByText('14.2s')).toBeInTheDocument()
  })

  it('aplica data-status correto por agente', () => {
    render(
      <AgentTimeline
        agents={makeAgents({
          technical: { status: 'running', elapsed: 1.0 },
          fundamental: { status: 'ok', elapsed: 12.0 },
          sentiment: { status: 'failed', elapsed: 9.0 },
        })}
      />
    )
    expect(screen.getByTestId('agent-status-technical')).toHaveAttribute('data-status', 'running')
    expect(screen.getByTestId('agent-status-fundamental')).toHaveAttribute('data-status', 'ok')
    expect(screen.getByTestId('agent-status-sentiment')).toHaveAttribute('data-status', 'failed')
    expect(screen.getByTestId('agent-status-bull')).toHaveAttribute('data-status', 'pending')
  })
})
```

- [ ] **Step 2: Rodar testes (esperar FALHA)**

Run: `cd ~/finswarm/web && npm test -- AgentTimeline`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar `web/src/components/AgentTimelineItem.tsx`**

```tsx
import type { AgentName, AgentStatus } from '../lib/types'
import { AGENT_LABELS } from '../lib/agentLabels'

interface AgentTimelineItemProps {
  agent: AgentName
  status: AgentStatus
  elapsed: number | null
  isLast: boolean
}

const STATUS_DOT_CLASSES: Record<AgentStatus, string> = {
  pending: 'bg-stone-text',
  running: 'bg-golden animate-pulse-golden',
  ok: 'bg-pure-white',
  failed: 'bg-status-failed',
}

const STATUS_LABEL_CLASSES: Record<AgentStatus, string> = {
  pending: 'text-ash-text',
  running: 'text-pure-white',
  ok: 'text-pure-white',
  failed: 'text-status-failed',
}

export function AgentTimelineItem({ agent, status, elapsed, isLast }: AgentTimelineItemProps) {
  return (
    <li className="relative flex items-start gap-4 pb-6">
      <div className="relative flex flex-col items-center">
        <span
          data-testid={`agent-status-${agent}`}
          data-status={status}
          className={`h-2 w-2 rounded-pill mt-2 ${STATUS_DOT_CLASSES[status]}`}
        />
        {!isLast && <span className="flex-1 w-px bg-silver-text/30 mt-1" />}
      </div>
      <div className="flex-1 flex items-baseline justify-between">
        <span className={`text-base font-medium ${STATUS_LABEL_CLASSES[status]}`}>
          {AGENT_LABELS[agent]}
        </span>
        {elapsed !== null && (
          <span className="text-xs text-stone-text tabular-nums">
            {elapsed.toFixed(1)}s
          </span>
        )}
      </div>
    </li>
  )
}
```

- [ ] **Step 4: Implementar `web/src/components/AgentTimeline.tsx`**

```tsx
import type { AgentName, AgentState } from '../lib/types'
import { AGENT_ORDER } from '../lib/types'
import { AgentTimelineItem } from './AgentTimelineItem'

interface AgentTimelineProps {
  agents: Record<AgentName, AgentState>
}

export function AgentTimeline({ agents }: AgentTimelineProps) {
  return (
    <ol className="list-none p-0 m-0">
      {AGENT_ORDER.map((name, idx) => (
        <AgentTimelineItem
          key={name}
          agent={name}
          status={agents[name].status}
          elapsed={agents[name].elapsed}
          isLast={idx === AGENT_ORDER.length - 1}
        />
      ))}
    </ol>
  )
}
```

- [ ] **Step 5: Rodar testes (esperar PASS)**

Run: `cd ~/finswarm/web && npm test -- AgentTimeline`
Expected: 3 testes passando.

- [ ] **Step 6: Commit**

```bash
cd ~/finswarm
git add web/src/components/AgentTimeline.tsx web/src/components/AgentTimelineItem.tsx web/src/test/AgentTimeline.test.tsx
git commit -m "feat(web): AgentTimeline component with status indicators"
```

---

## Task 10: ReportHero (TDD)

**Files:**
- Create: `web/src/components/ReportHero.tsx`
- Create: `web/src/test/ReportHero.test.tsx`

- [ ] **Step 1: Escrever testes que falham**

`web/src/test/ReportHero.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportHero } from '../components/ReportHero'
import type { AnalysisResult } from '../lib/types'

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    job_id: 'abc',
    ticker: 'PETR4.SA',
    timestamp: '2026-05-12T12:00:00Z',
    recommendation: 'COMPRAR',
    confidence: 0.78,
    risk_score: 42,
    stop_loss_pct: 5.2,
    agents: {} as AnalysisResult['agents'],
    elapsed_seconds: 540,
    cost_usd: 0,
    ...overrides,
  }
}

describe('ReportHero', () => {
  it('mostra recomendação, ticker e stats formatados', () => {
    render(<ReportHero result={makeResult()} />)
    expect(screen.getByRole('heading', { name: 'COMPRAR' })).toBeInTheDocument()
    expect(screen.getByText('PETR4.SA')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.getByText('42/100')).toBeInTheDocument()
    expect(screen.getByText('5.2%')).toBeInTheDocument()
  })

  it('aplica data-recommendation para estilização condicional', () => {
    const { rerender } = render(<ReportHero result={makeResult({ recommendation: 'VENDER' })} />)
    expect(screen.getByRole('heading', { name: 'VENDER' })).toHaveAttribute(
      'data-recommendation',
      'VENDER'
    )
    rerender(<ReportHero result={makeResult({ recommendation: 'MANTER' })} />)
    expect(screen.getByRole('heading', { name: 'MANTER' })).toHaveAttribute(
      'data-recommendation',
      'MANTER'
    )
  })
})
```

- [ ] **Step 2: Rodar testes (esperar FALHA)**

Run: `cd ~/finswarm/web && npm test -- ReportHero`
Expected: FAIL.

- [ ] **Step 3: Implementar `web/src/components/ReportHero.tsx`**

```tsx
import type { AnalysisResult, Recommendation } from '../lib/types'

interface ReportHeroProps {
  result: AnalysisResult
}

const RECOMMENDATION_CLASSES: Record<Recommendation, string> = {
  COMPRAR: 'text-pure-white',
  MANTER: 'text-porcelain-text',
  VENDER: 'bg-clip-text text-transparent bg-[var(--gradient-golden)]',
}

export function ReportHero({ result }: ReportHeroProps) {
  const formatted = {
    confidence: `${Math.round(result.confidence * 100)}%`,
    risk: `${result.risk_score}/100`,
    stopLoss: `${result.stop_loss_pct.toFixed(1)}%`,
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1
          data-recommendation={result.recommendation}
          className={`font-ivy text-6xl leading-none ${RECOMMENDATION_CLASSES[result.recommendation]}`}
        >
          {result.recommendation}
        </h1>
        <p className="text-xs text-ash-text">
          {result.ticker} · {new Date(result.timestamp).toLocaleString('pt-BR')}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-6 border-t border-silver-text/20 pt-6">
        <Stat label="Confiança" value={formatted.confidence} />
        <Stat label="Risco" value={formatted.risk} />
        <Stat label="Stop loss" value={formatted.stopLoss} />
      </dl>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wider text-stone-text">{label}</dt>
      <dd className="text-2xl text-pure-white tabular-nums">{value}</dd>
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes (esperar PASS)**

Run: `cd ~/finswarm/web && npm test -- ReportHero`
Expected: 2 testes passando.

- [ ] **Step 5: Commit**

```bash
cd ~/finswarm
git add web/src/components/ReportHero.tsx web/src/test/ReportHero.test.tsx
git commit -m "feat(web): ReportHero with recommendation and stats"
```

---

## Task 11: AgentCard expandível (TDD)

**Files:**
- Create: `web/src/components/AgentCard.tsx`
- Create: `web/src/test/AgentCard.test.tsx`

- [ ] **Step 1: Escrever testes que falham**

`web/src/test/AgentCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentCard } from '../components/AgentCard'
import type { AgentOutput } from '../lib/types'

const output: AgentOutput = {
  status: 'ok',
  summary: 'Tendência de alta com RSI em 62.',
  raw: { rsi: 62, macd: 'bullish' },
}

describe('AgentCard', () => {
  it('mostra nome, badge ok e summary quando colapsado', () => {
    render(<AgentCard agent="technical" output={output} />)
    expect(screen.getByText('Análise técnica')).toBeInTheDocument()
    expect(screen.getByText(/RSI em 62/)).toBeInTheDocument()
    expect(screen.queryByText(/"rsi": 62/)).not.toBeInTheDocument()
  })

  it('expande e mostra raw em JSON ao clicar', async () => {
    render(<AgentCard agent="technical" output={output} />)
    await userEvent.click(screen.getByRole('button', { name: /expandir/i }))
    expect(screen.getByText(/"rsi": 62/)).toBeInTheDocument()
  })

  it('mostra badge "falhou" quando status=failed', () => {
    render(
      <AgentCard
        agent="sentiment"
        output={{ status: 'failed', summary: 'rate limit', raw: {} }}
      />
    )
    expect(screen.getByText(/falhou/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar testes (esperar FALHA)**

Run: `cd ~/finswarm/web && npm test -- AgentCard`
Expected: FAIL.

- [ ] **Step 3: Implementar `web/src/components/AgentCard.tsx`**

```tsx
import { useState } from 'react'
import type { AgentName, AgentOutput } from '../lib/types'
import { AGENT_LABELS } from '../lib/agentLabels'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface AgentCardProps {
  agent: AgentName
  output: AgentOutput
}

export function AgentCard({ agent, output }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-pure-white">{AGENT_LABELS[agent]}</h3>
          <Badge tone={output.status === 'ok' ? 'ok' : 'failed'}>
            {output.status === 'ok' ? 'ok' : 'falhou'}
          </Badge>
        </div>
        <Button
          variant="sharp"
          aria-label={expanded ? 'Colapsar' : 'Expandir'}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '−' : '+'}
        </Button>
      </div>
      <p
        className={`mt-4 text-porcelain-text ${
          expanded ? '' : 'line-clamp-2'
        }`}
      >
        {output.summary}
      </p>
      {expanded && (
        <pre className="mt-4 bg-pewter-accent rounded-md p-4 text-[13px] font-mono text-silver-text overflow-x-auto">
          {JSON.stringify(output.raw, null, 2)}
        </pre>
      )}
    </Card>
  )
}
```

- [ ] **Step 4: Rodar testes (esperar PASS)**

Run: `cd ~/finswarm/web && npm test -- AgentCard`
Expected: 3 testes passando.

- [ ] **Step 5: Commit**

```bash
cd ~/finswarm
git add web/src/components/AgentCard.tsx web/src/test/AgentCard.test.tsx
git commit -m "feat(web): AgentCard with expandable raw output"
```

---

## Task 12: ErrorBanner

**Files:**
- Create: `web/src/components/ErrorBanner.tsx`

- [ ] **Step 1: Criar `web/src/components/ErrorBanner.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Button } from './ui/Button'

interface ErrorBannerProps {
  message: string
  action?: { label: string; onClick: () => void }
  children?: ReactNode
}

export function ErrorBanner({ message, action, children }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 bg-status-failed/10 border border-status-failed/40 rounded-md px-4 py-3"
    >
      <p className="text-sm text-status-failed">{message}</p>
      {action && (
        <Button variant="ghost" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/finswarm
git add web/src/components/ErrorBanner.tsx
git commit -m "feat(web): ErrorBanner component"
```

---

## Task 13: Página Home

**Files:**
- Create: `web/src/pages/Home.tsx`

- [ ] **Step 1: Criar `web/src/pages/Home.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TickerInput } from '../components/TickerInput'
import { ErrorBanner } from '../components/ErrorBanner'
import { ApiError, postAnalyze } from '../lib/api'

export function Home() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(ticker: string) {
    setSubmitting(true)
    setError(null)
    try {
      const job = await postAnalyze(ticker)
      navigate(`/analysis/${job.job_id}`)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(`Erro ${e.status}: ${e.message}`)
      } else {
        setError('Não foi possível iniciar a análise. Verifique sua conexão.')
      }
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[1216px] flex flex-col items-center gap-8 text-center">
        <h1 className="font-ivy text-[88px] leading-none text-pure-white tracking-tight">
          Análise multi-agente para a B3
        </h1>
        <p className="text-xl text-porcelain-text max-w-2xl">
          Sete agentes LLM avaliam técnico, fundamentos, sentimento e risco do ativo
          para produzir uma recomendação em minutos.
        </p>
        <div className="w-full max-w-xl flex flex-col gap-3 items-center">
          {error && <ErrorBanner message={error} />}
          <TickerInput onSubmit={handleSubmit} disabled={submitting} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/finswarm
git add web/src/pages/Home.tsx
git commit -m "feat(web): Home page with ticker input"
```

---

## Task 14: Página Analysis

**Files:**
- Create: `web/src/pages/Analysis.tsx`

- [ ] **Step 1: Criar `web/src/pages/Analysis.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useAnalysis } from '../lib/useAnalysis'
import { AgentTimeline } from '../components/AgentTimeline'
import { ReportHero } from '../components/ReportHero'
import { AgentCard } from '../components/AgentCard'
import { ErrorBanner } from '../components/ErrorBanner'
import { Button } from '../components/ui/Button'
import { AGENT_ORDER } from '../lib/types'
import { AGENT_RUNNING_PHRASES } from '../lib/agentLabels'

export function Analysis() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  if (!jobId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ErrorBanner
          message="ID da análise não encontrado."
          action={{ label: 'Nova análise', onClick: () => navigate('/') }}
        />
      </main>
    )
  }

  const { agents, currentAgent, result, error, connectionLost, reconnect } =
    useAnalysis(jobId)

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-[1216px] mx-auto grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-12">
        <aside>
          <header className="mb-8 flex items-center justify-between">
            <Button variant="sharp" onClick={() => navigate('/')}>
              ← Nova análise
            </Button>
          </header>
          <AgentTimeline agents={agents} />
        </aside>

        <section className="flex flex-col gap-6">
          {error && (
            <ErrorBanner
              message={error}
              action={{ label: 'Nova análise', onClick: () => navigate('/') }}
            />
          )}
          {connectionLost && !error && (
            <ErrorBanner
              message="Conexão interrompida."
              action={{ label: 'Tentar novamente', onClick: reconnect }}
            />
          )}

          {!result && !error && (
            <div className="flex items-center text-porcelain-text text-lg min-h-[120px]">
              {currentAgent
                ? AGENT_RUNNING_PHRASES[currentAgent]
                : 'Iniciando análise…'}
            </div>
          )}

          {result && (
            <>
              <ReportHero result={result} />
              <div className="flex flex-col gap-4">
                {AGENT_ORDER.map((name) => (
                  <AgentCard
                    key={name}
                    agent={name}
                    output={result.agents[name]}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/finswarm
git add web/src/pages/Analysis.tsx
git commit -m "feat(web): Analysis page with timeline and report"
```

---

## Task 15: Router em App.tsx

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Substituir `web/src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { Analysis } from './pages/Analysis'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/analysis/:jobId" element={<Analysis />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 2: Validar build e suite completa**

Run:
```bash
cd ~/finswarm/web && npm run build && npm test
```
Expected: build sem erros, todos os testes passando.

- [ ] **Step 3: Commit**

```bash
cd ~/finswarm
git add web/src/App.tsx
git commit -m "feat(web): wire routes in App"
```

---

## Task 16: CORS no backend

**Files:**
- Modify: `~/finswarm/src/api.py`

- [ ] **Step 1: Adicionar import e middleware em `src/api.py`**

Localizar o bloco de imports no topo de `src/api.py` e adicionar:

```python
from fastapi.middleware.cors import CORSMiddleware
```

Localizar a linha `app = FastAPI(title="FinSwarm", version="0.1.0")` e logo abaixo dela adicionar:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

- [ ] **Step 2: Rodar suite unitária do backend para garantir que nada quebrou**

Run:
```bash
cd ~/finswarm && poetry run pytest tests/unit/ -q
```
Expected: 33 passed.

- [ ] **Step 3: Commit**

```bash
cd ~/finswarm
git add src/api.py
git commit -m "feat(api): enable CORS for local web client"
```

---

## Task 17: Validação manual end-to-end

**Files:** nenhum

- [ ] **Step 1: Subir o backend em terminal 1**

Run em terminal separado:
```bash
cd ~/finswarm && poetry run uvicorn src.api:app --reload --port 8000
```
Expected: server escutando em `:8000`, `/health` responde.

- [ ] **Step 2: Subir o frontend em terminal 2**

Run em terminal separado:
```bash
cd ~/finswarm/web && npm run dev
```
Expected: server em `http://localhost:5173`.

- [ ] **Step 3: Validar fluxo no browser**

Abrir `http://localhost:5173`. Conferir visualmente:
- Fundo Midnight Ink (#000000), headline em Playfair Display, body em Inter
- Input pill com borda branca, botão "Analisar" pill branco
- Digitar `PETR4` (sem .SA) e clicar Analisar
- URL muda para `/analysis/<jobId>`
- Timeline mostra os 7 agentes; ao receber `agent_start`, o agente correspondente fica com bolinha pulsante golden
- Mensagem contextual à direita muda conforme o `currentAgent`
- Ao terminar (~9 min), ReportHero aparece com recomendação e stats; cards expandem ao clicar
- Recarregar a página de análise deve mostrar erro (job_id já consumido — esperado para o MVP)

Se algo falhar visualmente, ajustar o componente correspondente e re-validar. Encerrar ambos os servers após validação.

- [ ] **Step 4: Atualizar STATUS.md**

Localizar em `~/finswarm/docs/STATUS.md` a seção `## Estrutura de Arquivos` e adicionar abaixo do bloco existente:

```markdown
## Frontend (`web/`)

- Vite 5 + React 18 + TypeScript + Tailwind v4
- 2 rotas: `/` (Home) e `/analysis/:jobId`
- Componentes seguem `DESIGN.md` (Slash — Midnight Ledger)
- WebSocket consumido via hook `useAnalysis`
- Testes: Vitest + RTL + mock-socket
- Rodar em dev: `cd web && npm run dev` (proxy automático para :8000)
```

- [ ] **Step 5: Commit final**

```bash
cd ~/finswarm
git add docs/STATUS.md
git commit -m "docs: document web/ frontend in STATUS.md"
```

---

## Notas finais

- Em qualquer task, se um teste falhar inesperadamente, rodar com `npm test -- --reporter=verbose` para mais detalhes.
- O backend não muda além da Task 16 (CORS). Qualquer alteração em rotas, modelos ou eventos WS exige atualizar `web/src/lib/types.ts` correspondente.
- A validação visual da Task 17 é parte do critério de aceite — o MVP só está completo quando o fluxo end-to-end funciona no browser.
