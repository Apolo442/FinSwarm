# FinSwarm — Status do Projeto (2026-05-13)

## Onde estamos

Branch ativo: **`feat/web`** (24 commits à frente de `main`).

- Backend FinSwarm (Python) — completo e funcional. 33 testes unitários + 1 integração (PETR4 PASSED 570s) verdes.
- Frontend FinSwarm Web (Vite + React + TS + Tailwind v4) — estrutural completo, 19 testes verdes, `npm run build` verde.
- Integração e2e backend↔frontend — **funcional**. WebSocket (Chrome ↔ uvicorn) resolvido com `--ws wsproto` + bypass direto no `useAnalysis.ts`.

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

## To-do (próximas sessões)

### [ ] Refatorar tela de pré-análise (inserção do ativo)

- Tela `Home.tsx` + `TickerInput.tsx` precisam de revisão visual e de UX.

### [ ] Refatorar tela de pós-análise (relatório visual)

- `ReportHero.tsx` + `AgentSlot.tsx` no estado `ok` — layout e hierarquia visual do relatório final.

### [ ] Persistência de análises (SQLite — MVP)

- Hoje o estado dos jobs vive em `_jobs: dict[str, asyncio.Queue]` em memória; reiniciar o uvicorn apaga tudo.
- Persistir resultados concluídos em SQLite (`~/finswarm/data/analyses.db`) para histórico e navegação offline.
- Backend: salvar `AnalysisResult` ao final de cada job. Frontend: tela de histórico simples (lista de análises salvas).

## Fora do MVP (não priorizado)

- Autenticação
- Export PDF / share image
- Deploy
- i18n

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
