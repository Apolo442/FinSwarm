# FinSwarm — Status do Projeto (2026-05-12 fim do dia)

## Onde estamos

Branch ativo: **`feat/web`** (24 commits à frente de `main`).

- Backend FinSwarm (Python) — completo e funcional. 33 testes unitários + 1 integração (PETR4 PASSED 570s) verdes.
- Frontend FinSwarm Web (Vite + React + TS + Tailwind v4) — **estrutural completo, ajuste fino visual em aberto**, 19 testes verdes, `npm run build` verde.
- Integração e2e backend↔frontend — **funcional mas com problemas conhecidos abaixo**.

## Stack

- **Backend:** Python 3.12, FastAPI, OpenRouter via OpenAI SDK, yfinance, fundamentus, GNews, 7 agentes orquestrados com asyncio.
- **Frontend:** Vite 5, React 18, TypeScript 5, Tailwind v4 (`@tailwindcss/vite`), React Router 6, Vitest + RTL + mock-socket.
- **Estilo visual:** `DESIGN.md` (raiz do repo) — sistema "Slash / Midnight Ledger, Obsidian Surfaces", dark fintech tipo Ramp/Mercury.

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
│   ├── api.py                        # FastAPI + CORS (allow_origins=:5173)
│   ├── orchestrator.py
│   ├── models.py
│   ├── agents/                       # 7 agentes
│   ├── data/                         # yfinance, fundamentus, news
│   └── llm/
│       ├── client.py                 # AsyncOpenAI → OpenRouter
│       ├── routing.py                # ROUTING_TABLE
│       └── cache.py
├── web/                              # frontend Vite
│   ├── vite.config.ts                # proxy / + types ref vitest
│   ├── src/
│   │   ├── main.tsx, App.tsx
│   │   ├── index.css                 # @theme tailwind v4 com tokens DESIGN.md
│   │   ├── pages/
│   │   │   ├── Home.tsx              # hero + TickerInput
│   │   │   └── Analysis.tsx          # split timeline + AgentSlots
│   │   ├── components/
│   │   │   ├── TickerInput.tsx
│   │   │   ├── AgentTimeline.tsx     # stepper 01..07 numerado
│   │   │   ├── AgentTimelineItem.tsx
│   │   │   ├── AgentSlot.tsx         # card por agente (pending/running/ok/failed)
│   │   │   ├── AgentCard.tsx         # versão legada (só p/ result final) — mantido p/ tests
│   │   │   ├── ReportHero.tsx
│   │   │   ├── ErrorBanner.tsx
│   │   │   └── ui/{Button,Card,Badge}.tsx
│   │   └── lib/
│   │       ├── types.ts              # AGENT_ORDER, AgentName, AnalysisResult, WsEvent
│   │       ├── agentLabels.ts        # AGENT_LABELS + AGENT_RUNNING_PHRASES
│   │       ├── api.ts                # postAnalyze + ApiError
│   │       └── useAnalysis.ts        # hook WebSocket
│   └── test/                         # 19 testes vitest
├── DESIGN.md                         # sistema visual completo (Tailwind v4 @theme)
├── docs/
│   ├── STATUS.md                     # você está aqui
│   └── superpowers/
│       ├── specs/2026-05-12-finswarm-web-design.md
│       └── plans/2026-05-12-finswarm-web.md
└── pyproject.toml                    # + wsproto, pytest-timeout
```

## Routing LLM atual

```python
"default":   primary="openai/gpt-oss-120b:free",        fallback="z-ai/glm-4.5-air:free"
"sentiment": primary="z-ai/glm-4.5-air:free",           fallback="openai/gpt-oss-120b:free"
"synthesis": primary="nvidia/nemotron-3-super-120b-a12b:free", fallback="openai/gpt-oss-120b:free"
# backoff: [10, 25, 50] segundos
```

**Histórico do dia:** `meta-llama/llama-3.3-70b-instruct:free` e `qwen/qwen3-next-80b-a3b-instruct:free` estavam dando TIMEOUT upstream em 2026-05-12 às 16h. Foram removidos. Os 3 acima estavam respondendo OK no mesmo horário (validado por ping direto via OpenRouter).

## Problemas em aberto (em ordem de urgência)

### 1. WebSocket do Chrome rejeitado com 400 (parcialmente mitigado)

- **Sintoma:** logs do uvicorn mostravam `connection rejected (400 Bad Request)` toda vez que o browser tentava conectar `/ws/{jobId}`. Análise rodava no backend mas frontend ficava travado em "Iniciando análise…".
- **Causa-raiz:** lib `websockets` 16.0 (default do `uvicorn[standard]`) rejeita headers de upgrade que o Chrome envia (`Connection: keep-alive, Upgrade`).
- **Mitigação aplicada:**
  1. `useAnalysis.ts`: em dev, bypassa o proxy do Vite e conecta direto em `ws://localhost:8000/ws/{jobId}` (o proxy também tinha problemas similares).
  2. Rodar uvicorn com `--ws wsproto` (lib mais permissiva). `wsproto` adicionado às deps.
- **Validação pendente:** confirmar visualmente que com `--ws wsproto` o handshake passa. Última iteração não foi confirmada pelo usuário.

### 2. Análise leva ~9-20 min com modelos `:free`

- 7 agentes × backoffs frequentes = tempo total inconsistente. Modelos `:free` somem do dia pra noite.
- **Solução estrutural:** adicionar US$5 de crédito na conta OpenRouter. Remove rate limit dos `:free` (50/dia → 1000/dia) e libera modelos pagos (gpt-4o-mini ~US$0.02/análise, claude-haiku ~US$0.04/análise). Análise cai pra 1-2 min e qualidade sobe.

### 3. Estado de loading ainda visualmente "vazio" segundo o usuário

- **Iteração atual:**
  - Header alinhado: "← Nova análise" + brand caption.
  - Sidebar 280px com label "Pipeline" e stepper numerado 01..07.
  - Hero `LiveHeader` no topo da coluna direita com "Analisando", ticker, cronômetro, gradient golden.
  - 7 `AgentSlot` cards renderizados desde o início, refletindo status pending/running/ok/failed.
- **Feedback do usuário antes do restart:** "+80% da tela vazia, sidebar mal alinhada, timeline feia". Após reformulação ainda não houve confirmação final.

### 4. Job state perdido em restart do backend

- `_jobs: dict[str, asyncio.Queue]` vive em memória. Reiniciar uvicorn invalida todos os `job_id` em aberto. Aceitável no MVP, mas confunde durante debug.

## O que NÃO foi feito (fora do MVP)

- Persistência de jobs (Redis, SQLite, arquivo)
- Autenticação
- Histórico de análises
- Export PDF / share image
- Deploy
- i18n
- Validação manual e2e formal da Task 17 do plano

## Para retomar a sessão

**Ler nesta ordem:**

1. **`docs/STATUS.md`** (este arquivo) — começa aqui sempre.
2. **`docs/superpowers/specs/2026-05-12-finswarm-web-design.md`** — spec original do frontend (a verdade sobre o que deveria existir).
3. **`docs/superpowers/plans/2026-05-12-finswarm-web.md`** — plano de implementação (17 tasks); útil pra entender de onde veio cada arquivo.
4. **`DESIGN.md`** — referência visual obrigatória pra qualquer mexida em UI.

**Pesquisar no log do dia:**

```bash
git log --oneline feat/web ^main      # 24 commits do trabalho de hoje
git diff main feat/web -- web/        # diff completo do frontend
```

**Próximas perguntas a fazer ao usuário:**

- O `--ws wsproto` resolveu o 400 do WebSocket?
- A análise completou e o relatório apareceu?
- Como ficou o visual depois do rework (LiveHeader + AgentSlot + stepper numerado)? Vale screenshot novo.
- Decidiu se vai pôr US$5 de crédito na OpenRouter? Se sim, plano: adicionar modelos pagos no `routing.py`, encurtar backoff pra `[2, 4, 8]s`.

**Cuidados ao retomar:**

- Backend deve subir com `--ws wsproto` SEMPRE em dev (sem isso o WS quebra silenciosamente).
- `npm run dev` deve estar rodando — se houver Vite "zumbi" de sessão anterior (`pgrep -af vite`), matar antes de reiniciar.
- Modelos `:free` mudam de estabilidade no dia. Antes de declarar bug, pingar cada modelo do `routing.py` via `OPENROUTER_API_KEY` e ver quais respondem:

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
