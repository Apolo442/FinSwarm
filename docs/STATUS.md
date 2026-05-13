# FinSwarm — Status do Projeto (2026-05-13)

## Onde estamos

Branch ativo: **`feat/web`** (31+ commits à frente de `main`).

- Backend FinSwarm (Python) — completo e funcional. 43 testes unitários verdes.
- Frontend FinSwarm Web (Vite + React + TS + Tailwind v4) — completo, 31 testes verdes, `npm run build` verde.
- Integração e2e backend↔frontend — **funcional**. WebSocket (Chrome ↔ uvicorn) resolvido com `--ws wsproto` + bypass direto no `useAnalysis.ts`.
- Persistência SQLite — **implementada**. Análises concluídas são salvas em `data/analyses.db` e exibidas no drawer de histórico na Home.

## Stack

- **Backend:** Python 3.12, FastAPI, OpenRouter via OpenAI SDK, yfinance, fundamentus, GNews, 7 agentes orquestrados com asyncio, aiosqlite.
- **Frontend:** Vite 5, React 18, TypeScript 5, Tailwind v4 (`@tailwindcss/vite`), React Router 6, Vitest + RTL + mock-socket.
- **Estilo visual:** `style.md` (raiz do repo) — referência de design.

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
│   ├── api.py                        # FastAPI + CORS + lifespan (init_db)
│   ├── db.py                         # SQLite via aiosqlite (init, save, list, get)
│   ├── orchestrator.py
│   ├── models.py                     # AnalysisResult, AnalysisRow, WsEvent, ...
│   ├── agents/                       # 7 agentes
│   ├── data/                         # yfinance, fundamentus, news
│   └── llm/
│       ├── client.py                 # AsyncOpenAI → OpenRouter
│       ├── routing.py                # ROUTING_TABLE
│       └── cache.py
├── web/                              # frontend Vite
│   ├── vite.config.ts                # proxy /analyze /analyses /health /ws
│   ├── src/
│   │   ├── main.tsx, App.tsx
│   │   ├── index.css                 # @theme tailwind v4 com tokens style.md
│   │   ├── pages/
│   │   │   ├── Home.tsx              # grid 2 colunas: hero+input | HistoryDrawer
│   │   │   └── Analysis.tsx          # split timeline + AgentSlots
│   │   ├── components/
│   │   │   ├── TickerInput.tsx
│   │   │   ├── AgentTimeline.tsx
│   │   │   ├── AgentTimelineItem.tsx
│   │   │   ├── AgentSlot.tsx
│   │   │   ├── AgentCard.tsx         # legado, mantido p/ tests
│   │   │   ├── ReportHero.tsx
│   │   │   ├── ErrorBanner.tsx
│   │   │   ├── HistoryDrawer.tsx     # drawer lateral com busca + filtros
│   │   │   ├── HistoryModal.tsx      # modal overlay com relatório completo
│   │   │   └── ui/{Button,Card,Badge}.tsx
│   │   └── lib/
│   │       ├── types.ts              # AGENT_ORDER, AnalysisResult, AnalysisRow, WsEvent
│   │       ├── agentLabels.ts
│   │       ├── api.ts                # postAnalyze, fetchAnalyses, fetchAnalysis
│   │       └── useAnalysis.ts        # hook WebSocket
│   └── test/                         # 31 testes vitest
├── style.md                          # referência de design (ÚNICA fonte de verdade visual)
├── data/                             # ignorado pelo git
│   └── analyses.db                   # SQLite — criado automaticamente
├── docs/
│   ├── STATUS.md                     # você está aqui
│   └── superpowers/
│       ├── specs/
│       │   ├── 2026-05-12-finswarm-web-design.md
│       │   └── 2026-05-13-persistence-history-design.md
│       └── plans/
│           ├── 2026-05-12-finswarm-web.md
│           └── 2026-05-13-persistence-history.md
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

### [ ] Refatorar tela de pré-análise (inserção do ativo)

- `Home.tsx` + `TickerInput.tsx` precisam de revisão visual e de UX.

### [ ] Refatorar tela de pós-análise (relatório visual)

- `ReportHero.tsx` + `AgentSlot.tsx` no estado `ok` — layout e hierarquia visual do relatório final.

### [x] Persistência de análises (SQLite — MVP)

- `src/db.py` + `data/analyses.db` + endpoints `GET /analyses` e `GET /analyses/{job_id}`.
- `HistoryDrawer` sempre visível na coluna direita da Home; busca por ticker, filtro por recomendação.
- `HistoryModal` overlay com relatório completo ao clicar num item do histórico.
- Drawer recarrega automaticamente ao retornar de uma análise (via `location.key`).

## Fora do MVP (não priorizado)

- Autenticação
- Export PDF / share image
- Deploy
- i18n

## Para retomar a sessão

**Ler nesta ordem:**

1. **`docs/STATUS.md`** (este arquivo) — começa aqui sempre.
2. **`style.md`** — referência visual obrigatória pra qualquer mexida em UI.
3. **`docs/superpowers/specs/2026-05-12-finswarm-web-design.md`** — spec original do frontend.
4. **`docs/superpowers/plans/2026-05-12-finswarm-web.md`** — plano do frontend.

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
