# FinSwarm — Status do Projeto (2026-05-12)

## O que é o FinSwarm

Sistema multi-agente de análise de ações da B3. Recebe um ticker (ex: `PETR4.SA`) e retorna uma recomendação (`COMPRAR` / `MANTER` / `VENDER`) produzida por 7 agentes LLM orquestrados com `asyncio`.

## Stack

- **Python 3.12** + **Poetry**
- **FastAPI** (API HTTP + WebSocket)
- **OpenRouter** como gateway LLM (modelos gratuitos)
- **OpenAI SDK** (`AsyncOpenAI` com `base_url` apontando para OpenRouter)
- **yfinance** + `ta` (dados de mercado e indicadores técnicos locais)
- **Fundamentus** (scraping de fundamentos B3)
- **GNews API** via `httpx` (notícias/sentimento)
- **Pydantic v2** para todos os contratos de dados
- **pytest** + `pytest-asyncio` + `pytest-mock` (testes unitários com `AsyncMock`)

## Estrutura de Arquivos

```
finswarm/
├── src/
│   ├── models.py           # AgentOutput, AnalysisResult, JobStatus, WsEvent
│   ├── orchestrator.py     # run_analysis(): fase 1 paralela + fase 2 sequencial
│   ├── api.py              # FastAPI: POST /analyze, GET /ws/{job_id}, GET /health
│   ├── agents/
│   │   ├── base.py         # BaseAgent ABC: routing_key, run(), _extract_json()
│   │   ├── technical.py    # TechnicalAgent (routing: "default")
│   │   ├── fundamental.py  # FundamentalAgent (routing: "default")
│   │   ├── sentiment.py    # SentimentAgent (routing: "sentiment")
│   │   ├── debaters.py     # BullAgent + BearAgent (routing: "default")
│   │   ├── risk.py         # RiskAgent (routing: "default")
│   │   └── synthesis.py    # SynthesisAgent (routing: "synthesis")
│   ├── data/
│   │   ├── market.py       # fetch_market_data() → yfinance + RSI/MACD/Bollinger via ta
│   │   ├── fundamentus.py  # fetch_fundamentus() → scraping fundamentus.com.br
│   │   └── news.py         # fetch_news() → GNews API async
│   └── llm/
│       ├── client.py       # LLMClient: complete(), complete_with_routing(), semáforo global
│       ├── routing.py      # ROUTING_TABLE com primary/fallback/backoff por chave
│       └── cache.py        # TTLCache (dict + monotonic clock, sem Redis)
├── tests/
│   ├── conftest.py         # load_dotenv() + fixture mock_llm
│   ├── unit/               # 33 testes unitários (todos passando)
│   └── integration/
│       └── test_full_analysis.py  # Teste real contra OpenRouter com PETR4.SA
├── .env                    # OPENROUTER_API_KEY=sk-or-... (não commitado)
└── pyproject.toml
```

## Como rodar

```bash
cd ~/finswarm

# Testes unitários (sem API key, rápido)
poetry run pytest tests/unit/ -q

# Teste de integração (requer .env com OPENROUTER_API_KEY, ~10min)
poetry run pytest tests/integration/ -v -s

# API (servidor local)
poetry run uvicorn src.api:app --reload --port 8000

# Testar API manualmente
curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker":"PETR4.SA"}' | python3 -m json.tool
```

## Fluxo de Análise

```
POST /analyze → retorna job_id (202)
GET /ws/{job_id} → WebSocket com eventos de progresso em tempo real

run_analysis("PETR4.SA"):
  ├─ Coleta dados em paralelo (yfinance, Fundamentus, GNews)
  ├─ Fase 1 (paralelo): TechnicalAgent, FundamentalAgent, SentimentAgent
  └─ Fase 2 (sequencial): BullAgent → BearAgent → RiskAgent → SynthesisAgent
```

## Routing LLM (src/llm/routing.py — estado atual)

```python
ROUTING_TABLE = {
    "default":   primary="meta-llama/llama-3.3-70b-instruct:free",      fallback="openai/gpt-oss-120b:free"
    "sentiment": primary="qwen/qwen3-next-80b-a3b-instruct:free",       fallback="z-ai/glm-4.5-air:free"
    "synthesis": primary="nvidia/nemotron-3-super-120b-a12b:free",      fallback="openai/gpt-oss-120b:free"
}
# backoff: [40.0, 60.0, 90.0] segundos entre tentativas
```

**Por que esses modelos:** 5 provedores totalmente independentes (Meta, OpenAI, Qwen, ZhipuAI, NVIDIA) para não correlacionar rate limits upstream. Hermes-3-405b foi removido por ser lento/instável como `:free`.

## Estado dos Testes

### Unitários: 33/33 passando

```bash
poetry run pytest tests/unit/ -q
```

### Integração: PASSED (2026-05-12)

```
tests/integration/test_full_analysis.py::test_full_analysis_petr4 PASSED
1 passed in 569.98s (0:09:29)
```

Fluxo completo PETR4.SA validado end-to-end contra OpenRouter real.

## Histórico do problema de rate limit (resolvido)

| Problema | Correção | Commit |
|----------|----------|--------|
| Chamadas paralelas causavam 429 simultâneos | `asyncio.Semaphore(1)` em `LLMClient` | `26f2bc8` |
| `google/gemma-4-31b-it:free` bloqueado upstream | Trocado por Meta/NousResearch/NVIDIA | `bd43b59` |
| Backoff de 35s insuficiente | Aumentado para `[40, 60, 90]` | `bd43b59` |
| `conftest.py` importava `LLMClient` no nível de módulo | Lazy import dentro da fixture | `f9d3c50` |
| Hermes-3-405b lento/instável | Substituído por Qwen/GLM/gpt-oss diversificando provedores | (atual) |

## Histórico de Commits

```
bd43b59  fix: replace Google AI Studio model with non-Google free models
26f2bc8  fix: serialize concurrent LLM calls with semaphore to avoid rate limits
ee20894  fix: correct model IDs, respect Retry-After on 429
67df992  test: add integration test for full PETR4 analysis
0ae049d  fix: memory leak in WebSocket cleanup
7fc9679  feat: FastAPI with POST /analyze and WebSocket
81a7e29  feat: orchestrator with parallel phase 1
9744034  feat: RiskAgent
81a7e29  feat: BullAgent + BearAgent
...      feat: todos os 7 agentes + dados + LLM client
a44fd8b  chore: project setup
```

## Testes Unitários (estado atual)

```
33 passed in ~36s
```

Todos passando. Usam `AsyncMock` para o `LLMClient`, sem chamadas reais à API.
