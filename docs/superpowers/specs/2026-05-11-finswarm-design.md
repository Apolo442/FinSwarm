# FinSwarm — Design Spec

**Data:** 2026-05-11  
**Mercado-alvo:** Brasil (B3), extensível para US  
**Interface principal:** FastAPI REST + WebSocket

---

## Objetivo

Sistema multiagente de análise de investimentos que simula um time profissional de investimento. Dado um ticker (ex: `PETR4.SA`), retorna em menos de 2 minutos um relatório estruturado com análise técnica, fundamentalista, sentimento, debate bull/bear, score de risco e recomendação final. Custo operacional próximo de zero via modelos gratuitos no OpenRouter.

---

## Decisões de Arquitetura

### Orquestração: asyncio custom (sem framework)

Escolhido sobre CrewAI e LangGraph. O padrão de execução é um DAG simples:
- **Fase 1 (paralela):** 3 agentes independentes rodam via `asyncio.gather()`
- **Fase 2 (sequencial):** Bull/Bear → Risco → Síntese, cada um dependendo do anterior

Isso reduz o tempo total de ~90s (sequencial) para ~30s sem nenhuma complexidade de framework.

### LLM Gateway: OpenAI SDK → OpenRouter

O SDK oficial da OpenAI é usado diretamente com `base_url="https://openrouter.ai/api/v1"`. Nenhum SDK proprietário do OpenRouter é necessário. Toda troca de modelo é feita pela tabela de routing em `src/llm/routing.py`.

### Indicadores técnicos: lib `ta` (local)

RSI, MACD e Bandas de Bollinger são calculados localmente com a biblioteca `ta` antes de qualquer chamada LLM. O agente técnico recebe valores prontos e apenas interpreta — não calcula. Isso elimina imprecisão numérica dos LLMs e reduz tokens em ~70%.

### Cache: dict em memória com TTL

Redis removido do MVP. Um dict com timestamp de expiração cobre 100% dos casos de uso (evitar re-análise do mesmo ticker na mesma hora). Redis pode ser adicionado na v2 se escala exigir.

### Resiliência: falha graceful por agente

Cada chamada LLM tenta `primary` → `fallback` com backoff exponencial (1s, 2s, 4s). Se ambos falharem, o agente retorna `AgentOutput(status="failed")`. O orquestrador nunca aborta — informa a síntese quais agentes falharam e ela produz o relatório com os dados disponíveis.

---

## Estrutura de Diretórios

```
finswarm/
├── src/
│   ├── agents/
│   │   ├── base.py          # BaseAgent: prompt → LLM → AgentOutput tipado
│   │   ├── technical.py     # Interpreta RSI/MACD/Bollinger pré-calculados
│   │   ├── fundamental.py   # P/L, ROE, Dívida/EBITDA, crescimento
│   │   ├── sentiment.py     # Score de sentimento via notícias (7 dias)
│   │   ├── debaters.py      # BullAgent + BearAgent (3 argumentos cada)
│   │   ├── risk.py          # Score 0-100, stop-loss sugerido, sizing
│   │   └── synthesis.py     # Recomendação final + Markdown
│   ├── data/
│   │   ├── market.py        # yfinance + cálculo de indicadores via ta
│   │   ├── fundamentus.py   # Scraping Fundamentus para dados B3
│   │   └── news.py          # NewsAPI / GNews (7 dias)
│   ├── llm/
│   │   ├── client.py        # OpenAI SDK apontado para OpenRouter
│   │   ├── routing.py       # Tabela primary/fallback por tipo de agente
│   │   └── cache.py         # Cache em memória com TTL configurável
│   ├── models.py            # Pydantic: AnalysisRequest, AgentOutput, AnalysisResult
│   ├── orchestrator.py      # DAG: gather fase 1 → sequencial fase 2
│   └── api.py               # FastAPI: POST /analyze + WebSocket /ws/{job_id}
├── tests/
│   ├── unit/                # Mock do LLM client, testa cada agente isolado
│   └── integration/         # @pytest.mark.integration, requer OPENROUTER_API_KEY
├── pyproject.toml
├── .env.example
└── README.md
```

---

## Agentes e Modelos

| Agente | Input | Output | Modelo primário | Fallback |
|--------|-------|--------|-----------------|----------|
| Técnico | RSI, MACD, Bollinger, volume | Tendência, suporte/resistência, sinal | `google/gemini-2.5-flash:free` | `meta-llama/llama-3.3-70b-instruct:free` |
| Fundamentalista | P/L, ROE, Dívida/EBITDA, margens | Saúde financeira, qualidade dos lucros | `meta-llama/llama-3.3-70b-instruct:free` | `google/gemini-2.5-flash:free` |
| Sentimento | Títulos de notícias (7 dias) | Score -1.0 a 1.0, catalisadores | `mistral/mistral-large-2407:free` | `google/gemini-2.5-flash:free` |
| Bull | Outputs fase 1 | 3 argumentos de alta com evidência | `google/gemini-2.5-flash:free` | `meta-llama/llama-3.3-70b-instruct:free` |
| Bear | Outputs fase 1 | 3 argumentos de baixa com evidência | `google/gemini-2.5-flash:free` | `meta-llama/llama-3.3-70b-instruct:free` |
| Risco | Todos outputs anteriores + volatilidade | Score 0-100, stop-loss %, max exposição % | `meta-llama/llama-3.3-70b-instruct:free` | `google/gemini-2.5-flash:free` |
| Síntese | Todos outputs | COMPRAR/MANTER/VENDER + confiança + Markdown | `qwen/qwen-2.5-72b-instruct:free` | `google/gemini-2.5-flash:free` |

---

## Contrato da API

### `POST /analyze`

Inicia a análise de forma assíncrona e retorna imediatamente um `job_id`. O cliente usa o WebSocket para acompanhar o progresso e receber o resultado final.

```json
// Request
{ "ticker": "PETR4.SA" }

// Response imediata (202 Accepted)
{ "job_id": "a3f9c1d2", "ticker": "PETR4.SA", "status": "running" }
```

`hitl` removido do MVP — validação Claude fica para v2.

### `GET /ws/{job_id}`

WebSocket para acompanhar progresso. Emite eventos JSON durante a análise; o último evento contém o `AnalysisResult` completo.

```json
{ "event": "agent_start",  "agent": "technical", "elapsed": 0.0 }
{ "event": "agent_done",   "agent": "technical", "elapsed": 14.2 }
{ "event": "agent_start",  "agent": "bull",       "elapsed": 14.3 }
{ "event": "done", "result": { ...AnalysisResult completo... } }
```

### `GET /health`

```json
{ "status": "ok", "version": "0.1.0" }
```

---

## Modelos Pydantic

```python
class AgentOutput(BaseModel):
    status: Literal["ok", "failed"]
    summary: str
    raw: dict  # output completo do agente

class AnalysisResult(BaseModel):
    job_id: str
    ticker: str
    timestamp: datetime
    recommendation: Literal["COMPRAR", "MANTER", "VENDER"]
    confidence: float  # 0.0 a 1.0
    risk_score: int    # 0 a 100
    stop_loss_pct: float
    agents: dict[str, AgentOutput]
    elapsed_seconds: float
    cost_usd: float
```

---

## Tabela de Routing LLM

```python
ROUTING_TABLE = {
    "default": {
        "primary": "google/gemini-2.5-flash:free",
        "fallback": "meta-llama/llama-3.3-70b-instruct:free",
        "retries": 3,
        "backoff": [1, 2, 4],
    },
    "sentiment": {
        "primary": "mistral/mistral-large-2407:free",
        "fallback": "google/gemini-2.5-flash:free",
    },
    "synthesis": {
        "primary": "qwen/qwen-2.5-72b-instruct:free",
        "fallback": "google/gemini-2.5-flash:free",
    },
    "hitl": {
        "primary": "anthropic/claude-3.5-sonnet",
        "fallback": None,
        "require_human_approval": True,
    },
}
```

---

## Dependências

```toml
[tool.poetry.dependencies]
python = "^3.12"
openai = "^1.30"          # SDK para OpenRouter
yfinance = "^0.2.40"
ta = "^0.11"              # Indicadores técnicos locais
beautifulsoup4 = "^4.12"
requests = "^2.31"
pandas = "^2.2"
pydantic = "^2.7"
fastapi = "^0.115"
uvicorn = "^0.30"
httpx = "^0.27"           # Cliente async para news APIs
python-dotenv = "^1.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0"
pytest-asyncio = "^0.23"
pytest-mock = "^3.14"
ruff = "^0.4"
```

---

## Testes

- **Unit:** cada agente testado com `AsyncMock` do LLM client; verifica que o output é um `AgentOutput` válido independente da resposta do modelo.
- **Integration:** marcados com `@pytest.mark.integration`; requer `OPENROUTER_API_KEY` no ambiente; testa o fluxo completo com PETR4.SA e valida que `recommendation` é uma das três opções válidas e `elapsed_seconds < 120`.

---

## O que está fora do escopo (v1)

- Redis / cache persistente
- Docker
- Deploy em cloud
- Streamlit dashboard
- Suporte a crypto
- Backtesting automatizado
- Agente de macroeconomia
