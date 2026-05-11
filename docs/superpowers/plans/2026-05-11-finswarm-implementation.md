# FinSwarm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um sistema multiagente de análise de investimentos com 7 agentes especializados, orquestrados via asyncio, expostos por FastAPI com WebSocket para progresso em tempo real.

**Architecture:** Fase 1 roda TechnicalAgent + FundamentalAgent + SentimentAgent em paralelo com `asyncio.gather()`. Fase 2 roda BullAgent → BearAgent → RiskAgent → SynthesisAgent sequencialmente. FastAPI expõe `POST /analyze` (assíncrono, retorna job_id imediato) e `GET /ws/{job_id}` para streaming de eventos.

**Tech Stack:** Python 3.12, FastAPI, uvicorn, OpenAI SDK (apontado para OpenRouter), yfinance, ta, beautifulsoup4, httpx, Pydantic v2, pytest, pytest-asyncio, ruff

---

## File Map

```
finswarm/
├── src/
│   ├── __init__.py
│   ├── models.py              # Todos os tipos Pydantic do sistema
│   ├── orchestrator.py        # DAG asyncio: fase1 paralela + fase2 sequencial
│   ├── api.py                 # FastAPI: POST /analyze, WS /ws/{job_id}, GET /health
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py            # BaseAgent: prompt → LLM → AgentOutput com fallback
│   │   ├── technical.py       # Interpreta RSI/MACD/Bollinger pré-calculados
│   │   ├── fundamental.py     # Avalia P/L, ROE, Dívida/EBITDA
│   │   ├── sentiment.py       # Score de sentimento via notícias
│   │   ├── debaters.py        # BullAgent + BearAgent (3 argumentos cada)
│   │   ├── risk.py            # Score 0-100, stop-loss, sizing
│   │   └── synthesis.py       # Recomendação COMPRAR/MANTER/VENDER + Markdown
│   ├── data/
│   │   ├── __init__.py
│   │   ├── market.py          # yfinance + cálculo de indicadores ta
│   │   ├── fundamentus.py     # Scraping Fundamentus.com.br
│   │   └── news.py            # GNews API (httpx async)
│   └── llm/
│       ├── __init__.py
│       ├── client.py          # AsyncOpenAI → OpenRouter + retry + fallback
│       ├── routing.py         # Tabela primary/fallback por tipo de agente
│       └── cache.py           # TTLCache: dict em memória com expiração
├── tests/
│   ├── conftest.py
│   ├── unit/
│   │   ├── test_cache.py
│   │   ├── test_client.py
│   │   ├── test_market.py
│   │   ├── test_fundamentus.py
│   │   ├── test_news.py
│   │   ├── test_technical.py
│   │   ├── test_fundamental.py
│   │   ├── test_sentiment.py
│   │   ├── test_debaters.py
│   │   ├── test_risk.py
│   │   ├── test_synthesis.py
│   │   └── test_orchestrator.py
│   └── integration/
│       └── test_full_analysis.py
├── pyproject.toml
├── .env.example
└── .gitignore
```

---

## Task 1: Project Setup

**Files:**
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/__init__.py`, `src/agents/__init__.py`, `src/data/__init__.py`, `src/llm/__init__.py`
- Create: `tests/__init__.py`, `tests/unit/__init__.py`, `tests/integration/__init__.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Criar pyproject.toml**

```toml
[tool.poetry]
name = "finswarm"
version = "0.1.0"
description = "Sistema multiagente de análise de investimentos"
authors = ["Mateus Sampaio"]
packages = [{ include = "src" }]

[tool.poetry.dependencies]
python = "^3.12"
openai = "^1.30"
yfinance = "^0.2.40"
ta = "^0.11"
beautifulsoup4 = "^4.12"
requests = "^2.31"
pandas = "^2.2"
pydantic = "^2.7"
fastapi = "^0.115"
uvicorn = { version = "^0.30", extras = ["standard"] }
httpx = "^0.27"
python-dotenv = "^1.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0"
pytest-asyncio = "^0.23"
pytest-mock = "^3.14"
ruff = "^0.4"

[tool.pytest.ini_options]
asyncio_mode = "auto"
markers = ["integration: requer OPENROUTER_API_KEY no ambiente"]

[tool.ruff]
line-length = 100
```

- [ ] **Step 2: Criar .env.example**

```bash
OPENROUTER_API_KEY=sk-or-v1-...
GNEWS_API_KEY=...        # opcional, fallback para yfinance.news
```

- [ ] **Step 3: Criar .gitignore**

```
.env
__pycache__/
*.py[cod]
.pytest_cache/
.ruff_cache/
dist/
.venv/
```

- [ ] **Step 4: Criar todos os __init__.py vazios**

```bash
touch src/__init__.py src/agents/__init__.py src/data/__init__.py src/llm/__init__.py
touch tests/__init__.py tests/unit/__init__.py tests/integration/__init__.py
```

- [ ] **Step 5: Criar tests/conftest.py**

```python
import pytest
from unittest.mock import AsyncMock
from src.llm.client import LLMClient


@pytest.fixture
def mock_llm(mocker):
    client = mocker.MagicMock(spec=LLMClient)
    client.complete = AsyncMock()
    return client
```

- [ ] **Step 6: Instalar dependências**

```bash
cd /home/mateus/finswarm
poetry install
```

Esperado: resolução de dependências sem erro.

- [ ] **Step 7: Commit**

```bash
git add pyproject.toml .env.example .gitignore src/ tests/
git commit -m "chore: project setup with Poetry"
```

---

## Task 2: Pydantic Models

**Files:**
- Create: `src/models.py`
- Create: `tests/unit/test_models.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_models.py
from src.models import AgentOutput, AnalysisResult, AnalysisRequest
from datetime import datetime, timezone


def test_agent_output_ok():
    out = AgentOutput(status="ok", summary="Tendência de alta", raw={"signal": "ALTA"})
    assert out.status == "ok"
    assert out.raw["signal"] == "ALTA"


def test_agent_output_failed():
    out = AgentOutput(status="failed", summary="Timeout", raw={})
    assert out.status == "failed"


def test_analysis_result_fields():
    result = AnalysisResult(
        job_id="abc123",
        ticker="PETR4.SA",
        timestamp=datetime.now(timezone.utc),
        recommendation="COMPRAR",
        confidence=0.72,
        risk_score=38,
        stop_loss_pct=8.5,
        agents={},
        elapsed_seconds=28.4,
        cost_usd=0.0,
    )
    assert result.recommendation == "COMPRAR"
    assert 0 <= result.confidence <= 1


def test_analysis_request_defaults():
    req = AnalysisRequest(ticker="VALE3.SA")
    assert req.ticker == "VALE3.SA"
```

- [ ] **Step 2: Rodar teste para verificar que falha**

```bash
poetry run pytest tests/unit/test_models.py -v
```

Esperado: `ImportError: cannot import name 'AgentOutput'`

- [ ] **Step 3: Implementar src/models.py**

```python
from __future__ import annotations
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


class AgentOutput(BaseModel):
    status: Literal["ok", "failed"]
    summary: str
    raw: dict[str, Any] = Field(default_factory=dict)


class AnalysisRequest(BaseModel):
    ticker: str


class AnalysisResult(BaseModel):
    job_id: str
    ticker: str
    timestamp: datetime
    recommendation: Literal["COMPRAR", "MANTER", "VENDER"]
    confidence: float = Field(ge=0.0, le=1.0)
    risk_score: int = Field(ge=0, le=100)
    stop_loss_pct: float
    agents: dict[str, AgentOutput]
    elapsed_seconds: float
    cost_usd: float = 0.0


class JobStatus(BaseModel):
    job_id: str
    ticker: str
    status: Literal["running", "done", "failed"]


class WsEvent(BaseModel):
    event: Literal["agent_start", "agent_done", "done", "error"]
    agent: str | None = None
    elapsed: float | None = None
    result: AnalysisResult | None = None
    message: str | None = None
```

- [ ] **Step 4: Rodar teste para verificar que passa**

```bash
poetry run pytest tests/unit/test_models.py -v
```

Esperado: 4 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/models.py tests/unit/test_models.py
git commit -m "feat: add Pydantic models"
```

---

## Task 3: LLM Cache, Routing e Client

**Files:**
- Create: `src/llm/cache.py`
- Create: `src/llm/routing.py`
- Create: `src/llm/client.py`
- Create: `tests/unit/test_cache.py`
- Create: `tests/unit/test_client.py`

### 3a: TTLCache

- [ ] **Step 1: Escrever teste do cache**

```python
# tests/unit/test_cache.py
import time
from src.llm.cache import TTLCache


def test_cache_miss_returns_none():
    cache = TTLCache(ttl_seconds=60)
    assert cache.get("key") is None


def test_cache_hit_returns_value():
    cache = TTLCache(ttl_seconds=60)
    cache.set("key", {"data": 42})
    assert cache.get("key") == {"data": 42}


def test_cache_expired_returns_none():
    cache = TTLCache(ttl_seconds=0)
    cache.set("key", "value")
    time.sleep(0.01)
    assert cache.get("key") is None


def test_cache_key_is_hash_of_inputs():
    cache = TTLCache(ttl_seconds=60)
    key = cache.make_key("prompt text", "model-name")
    assert isinstance(key, str) and len(key) == 32
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_cache.py -v
```

- [ ] **Step 3: Implementar src/llm/cache.py**

```python
import hashlib
import time
from typing import Any


class TTLCache:
    def __init__(self, ttl_seconds: int = 3600):
        self._store: dict[str, tuple[Any, float]] = {}
        self._ttl = ttl_seconds

    def make_key(self, prompt: str, model: str) -> str:
        return hashlib.md5(f"{prompt}{model}".encode()).hexdigest()

    def get(self, key: str) -> Any | None:
        if key in self._store:
            value, expires_at = self._store[key]
            if time.monotonic() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (value, time.monotonic() + self._ttl)
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_cache.py -v
```

### 3b: Routing Table

- [ ] **Step 5: Implementar src/llm/routing.py** (sem teste, é só dados)

```python
from typing import TypedDict


class RouteConfig(TypedDict, total=False):
    primary: str
    fallback: str | None
    retries: int
    backoff: list[float]


ROUTING_TABLE: dict[str, RouteConfig] = {
    "default": {
        "primary": "google/gemini-2.5-flash:free",
        "fallback": "meta-llama/llama-3.3-70b-instruct:free",
        "retries": 3,
        "backoff": [1.0, 2.0, 4.0],
    },
    "sentiment": {
        "primary": "mistral/mistral-large-2407:free",
        "fallback": "google/gemini-2.5-flash:free",
        "retries": 3,
        "backoff": [1.0, 2.0, 4.0],
    },
    "synthesis": {
        "primary": "qwen/qwen-2.5-72b-instruct:free",
        "fallback": "google/gemini-2.5-flash:free",
        "retries": 3,
        "backoff": [1.0, 2.0, 4.0],
    },
}


def get_route(key: str) -> RouteConfig:
    return ROUTING_TABLE.get(key, ROUTING_TABLE["default"])
```

### 3c: LLM Client

- [ ] **Step 6: Escrever teste do client**

```python
# tests/unit/test_client.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.llm.client import LLMClient


@pytest.fixture
def client():
    with patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}):
        return LLMClient()


@pytest.mark.asyncio
async def test_complete_returns_content(client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"signal": "ALTA"}'
    client._client.chat.completions.create = AsyncMock(return_value=mock_response)

    result = await client.complete(
        messages=[{"role": "user", "content": "test"}],
        model="google/gemini-2.5-flash:free",
    )
    assert result == '{"signal": "ALTA"}'


@pytest.mark.asyncio
async def test_complete_uses_cache_on_second_call(client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "cached"
    client._client.chat.completions.create = AsyncMock(return_value=mock_response)

    messages = [{"role": "user", "content": "same prompt"}]
    model = "google/gemini-2.5-flash:free"

    await client.complete(messages=messages, model=model)
    await client.complete(messages=messages, model=model)

    assert client._client.chat.completions.create.call_count == 1


@pytest.mark.asyncio
async def test_complete_with_fallback_on_error(client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "fallback result"

    calls = 0
    async def side_effect(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise Exception("rate limited")
        return mock_response

    client._client.chat.completions.create = AsyncMock(side_effect=side_effect)

    result = await client.complete_with_routing("default", [{"role": "user", "content": "test"}])
    assert result == "fallback result"
```

- [ ] **Step 7: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_client.py -v
```

- [ ] **Step 8: Implementar src/llm/client.py**

```python
from __future__ import annotations
import asyncio
import json
import os
from openai import AsyncOpenAI
from src.llm.cache import TTLCache
from src.llm.routing import get_route


class LLMClient:
    def __init__(self):
        self._client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ["OPENROUTER_API_KEY"],
        )
        self._cache = TTLCache(ttl_seconds=3600)

    async def complete(self, messages: list[dict], model: str) -> str:
        prompt_text = json.dumps(messages)
        cache_key = self._cache.make_key(prompt_text, model)
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        response = await self._client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.2,
        )
        content = response.choices[0].message.content or ""
        self._cache.set(cache_key, content)
        return content

    async def complete_with_routing(self, routing_key: str, messages: list[dict]) -> str:
        route = get_route(routing_key)
        backoff = route.get("backoff", [1.0, 2.0, 4.0])

        for attempt, delay in enumerate(backoff):
            model = route["primary"] if attempt == 0 else route.get("fallback", route["primary"])
            if model is None:
                raise RuntimeError(f"Sem fallback disponível para routing_key={routing_key}")
            try:
                return await self.complete(messages=messages, model=model)
            except Exception:
                if attempt == len(backoff) - 1:
                    raise
                await asyncio.sleep(delay)

        raise RuntimeError("Esgotadas todas as tentativas do LLM client")
```

- [ ] **Step 9: Rodar testes**

```bash
poetry run pytest tests/unit/test_cache.py tests/unit/test_client.py -v
```

Esperado: todos passando.

- [ ] **Step 10: Commit**

```bash
git add src/llm/ tests/unit/test_cache.py tests/unit/test_client.py
git commit -m "feat: add LLM client with TTL cache and routing fallback"
```

---

## Task 4: Market Data Collector

**Files:**
- Create: `src/data/market.py`
- Create: `tests/unit/test_market.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_market.py
import pandas as pd
import pytest
from unittest.mock import MagicMock, patch
from src.data.market import MarketData, fetch_market_data


def _make_hist():
    dates = pd.date_range("2025-01-01", periods=60, freq="B")
    return pd.DataFrame({
        "Close": [50.0 + i * 0.1 for i in range(60)],
        "Volume": [1_000_000] * 60,
    }, index=dates)


@patch("src.data.market.yf.Ticker")
def test_fetch_market_data_returns_market_data(mock_ticker_cls):
    mock_ticker = MagicMock()
    mock_ticker.history.return_value = _make_hist()
    mock_ticker.info = {"shortName": "Petrobras", "sector": "Energy"}
    mock_ticker_cls.return_value = mock_ticker

    result = fetch_market_data("PETR4.SA")

    assert isinstance(result, MarketData)
    assert result.ticker == "PETR4.SA"
    assert isinstance(result.rsi, float)
    assert isinstance(result.macd, float)
    assert isinstance(result.bb_upper, float)
    assert result.price > 0


@patch("src.data.market.yf.Ticker")
def test_fetch_market_data_rsi_in_valid_range(mock_ticker_cls):
    mock_ticker = MagicMock()
    mock_ticker.history.return_value = _make_hist()
    mock_ticker.info = {}
    mock_ticker_cls.return_value = mock_ticker

    result = fetch_market_data("PETR4.SA")
    assert 0 <= result.rsi <= 100
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_market.py -v
```

- [ ] **Step 3: Implementar src/data/market.py**

```python
from __future__ import annotations
from dataclasses import dataclass
import yfinance as yf
import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import MACD
from ta.volatility import BollingerBands


@dataclass
class MarketData:
    ticker: str
    price: float
    pct_20d: float
    volume_avg_20d: float
    rsi: float
    macd: float
    macd_signal: float
    macd_hist: float
    bb_upper: float
    bb_mid: float
    bb_lower: float
    name: str
    sector: str


def fetch_market_data(ticker: str) -> MarketData:
    t = yf.Ticker(ticker)
    hist = t.history(period="200d")
    info = t.info or {}

    close = hist["Close"]
    volume = hist["Volume"]

    rsi = RSIIndicator(close=close, window=14).rsi().iloc[-1]
    macd_ind = MACD(close=close)
    bb = BollingerBands(close=close, window=20, window_dev=2)

    return MarketData(
        ticker=ticker,
        price=float(close.iloc[-1]),
        pct_20d=float((close.iloc[-1] / close.iloc[-20] - 1) * 100),
        volume_avg_20d=float(volume.iloc[-20:].mean()),
        rsi=float(rsi),
        macd=float(macd_ind.macd().iloc[-1]),
        macd_signal=float(macd_ind.macd_signal().iloc[-1]),
        macd_hist=float(macd_ind.macd_diff().iloc[-1]),
        bb_upper=float(bb.bollinger_hband().iloc[-1]),
        bb_mid=float(bb.bollinger_mavg().iloc[-1]),
        bb_lower=float(bb.bollinger_lband().iloc[-1]),
        name=info.get("shortName", ticker),
        sector=info.get("sector", "N/A"),
    )
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_market.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/data/market.py tests/unit/test_market.py
git commit -m "feat: add market data collector with ta indicators"
```

---

## Task 5: Fundamentus Scraper

**Files:**
- Create: `src/data/fundamentus.py`
- Create: `tests/unit/test_fundamentus.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_fundamentus.py
from unittest.mock import patch, MagicMock
from src.data.fundamentus import FundamentusData, fetch_fundamentus


MOCK_HTML = """
<html><body>
<table>
<tr><td class="label"><span>P/L</span></td><td class="data"><span>8,5</span></td></tr>
<tr><td class="label"><span>P/VP</span></td><td class="data"><span>1,2</span></td></tr>
<tr><td class="label"><span>ROE</span></td><td class="data"><span>18,3%</span></td></tr>
<tr><td class="label"><span>Dív. Bruta/PL</span></td><td class="data"><span>0,8</span></td></tr>
<tr><td class="label"><span>Marg. EBIT</span></td><td class="data"><span>22,1%</span></td></tr>
</table>
</body></html>
"""


@patch("src.data.fundamentus.requests.get")
def test_fetch_fundamentus_parses_pl(mock_get):
    mock_resp = MagicMock()
    mock_resp.text = MOCK_HTML
    mock_resp.status_code = 200
    mock_get.return_value = mock_resp

    result = fetch_fundamentus("PETR4")
    assert isinstance(result, FundamentusData)
    assert result.pl == pytest.approx(8.5, 0.01)


@patch("src.data.fundamentus.requests.get")
def test_fetch_fundamentus_parses_roe(mock_get):
    mock_resp = MagicMock()
    mock_resp.text = MOCK_HTML
    mock_resp.status_code = 200
    mock_get.return_value = mock_resp

    result = fetch_fundamentus("PETR4")
    assert result.roe == pytest.approx(0.183, 0.01)


import pytest
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_fundamentus.py -v
```

- [ ] **Step 3: Implementar src/data/fundamentus.py**

```python
from __future__ import annotations
import re
from dataclasses import dataclass, field
import requests
from bs4 import BeautifulSoup


@dataclass
class FundamentusData:
    ticker: str
    pl: float = 0.0
    pvp: float = 0.0
    roe: float = 0.0
    divida_bruta_pl: float = 0.0
    margem_ebit: float = 0.0
    raw: dict = field(default_factory=dict)


def _parse_value(text: str) -> float:
    text = text.strip().replace(".", "").replace(",", ".").replace("%", "")
    try:
        return float(text)
    except ValueError:
        return 0.0


def fetch_fundamentus(ticker: str) -> FundamentusData:
    ticker_clean = ticker.replace(".SA", "").upper()
    url = f"https://www.fundamentus.com.br/detalhes.php?papel={ticker_clean}"
    headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"}
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    data: dict[str, float] = {}

    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        for i in range(len(cells) - 1):
            label_span = cells[i].find("span")
            value_span = cells[i + 1].find("span")
            if label_span and value_span:
                label = label_span.get_text(strip=True)
                value = _parse_value(value_span.get_text(strip=True))
                data[label] = value

    roe_raw = data.get("ROE", 0.0)
    margem_raw = data.get("Marg. EBIT", 0.0)

    return FundamentusData(
        ticker=ticker_clean,
        pl=data.get("P/L", 0.0),
        pvp=data.get("P/VP", 0.0),
        roe=roe_raw / 100 if roe_raw > 1 else roe_raw,
        divida_bruta_pl=data.get("Dív. Bruta/PL", 0.0),
        margem_ebit=margem_raw / 100 if margem_raw > 1 else margem_raw,
        raw=data,
    )
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_fundamentus.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/data/fundamentus.py tests/unit/test_fundamentus.py
git commit -m "feat: add Fundamentus scraper for B3 fundamentals"
```

---

## Task 6: News Collector

**Files:**
- Create: `src/data/news.py`
- Create: `tests/unit/test_news.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_news.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.data.news import fetch_news, NewsData


@pytest.mark.asyncio
@patch("src.data.news.httpx.AsyncClient")
async def test_fetch_news_returns_news_data(mock_client_cls):
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_client

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "articles": [
            {"title": "Petrobras sobe 3% após balanço", "publishedAt": "2026-05-10T12:00:00Z"},
            {"title": "Análise: PETR4 com potencial de alta", "publishedAt": "2026-05-09T08:00:00Z"},
        ]
    }
    mock_client.get = AsyncMock(return_value=mock_resp)

    result = await fetch_news("PETR4", "Petrobras")
    assert isinstance(result, NewsData)
    assert len(result.headlines) == 2
    assert "Petrobras sobe" in result.headlines[0]


@pytest.mark.asyncio
@patch("src.data.news.httpx.AsyncClient")
async def test_fetch_news_handles_api_error_gracefully(mock_client_cls):
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_client
    mock_client.get = AsyncMock(side_effect=Exception("timeout"))

    result = await fetch_news("PETR4", "Petrobras")
    assert isinstance(result, NewsData)
    assert result.headlines == []
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_news.py -v
```

- [ ] **Step 3: Implementar src/data/news.py**

```python
from __future__ import annotations
import os
from dataclasses import dataclass, field
import httpx


@dataclass
class NewsData:
    ticker: str
    headlines: list[str] = field(default_factory=list)


async def fetch_news(ticker: str, company_name: str) -> NewsData:
    api_key = os.environ.get("GNEWS_API_KEY", "")
    if not api_key:
        return NewsData(ticker=ticker)

    query = f"{company_name} OR {ticker.replace('.SA', '')}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://gnews.io/api/v4/search",
                params={
                    "q": query,
                    "lang": "pt",
                    "country": "br",
                    "max": 10,
                    "from": _days_ago(7),
                    "apikey": api_key,
                },
            )
            if resp.status_code != 200:
                return NewsData(ticker=ticker)
            articles = resp.json().get("articles", [])
            return NewsData(
                ticker=ticker,
                headlines=[a["title"] for a in articles if a.get("title")],
            )
    except Exception:
        return NewsData(ticker=ticker)


def _days_ago(days: int) -> str:
    from datetime import datetime, timedelta, timezone
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_news.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/data/news.py tests/unit/test_news.py
git commit -m "feat: add async news collector via GNews API"
```

---

## Task 7: BaseAgent

**Files:**
- Create: `src/agents/base.py`
- Create: `tests/unit/test_base_agent.py` (implícito nos testes dos agentes filhos)

- [ ] **Step 1: Implementar src/agents/base.py**

Não há teste direto (é classe abstrata). Os agentes filhos provam o comportamento.

```python
from __future__ import annotations
import json
import logging
from abc import ABC, abstractmethod
from src.llm.client import LLMClient
from src.models import AgentOutput

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    routing_key: str = "default"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    @abstractmethod
    def build_messages(self, **kwargs) -> list[dict]:
        ...

    @abstractmethod
    def parse_output(self, content: str) -> dict:
        ...

    async def run(self, **kwargs) -> AgentOutput:
        messages = self.build_messages(**kwargs)
        try:
            content = await self.llm.complete_with_routing(self.routing_key, messages)
            raw = self.parse_output(content)
            summary = raw.get("summary", content[:200])
            return AgentOutput(status="ok", summary=summary, raw=raw)
        except Exception as exc:
            logger.warning("Agente %s falhou: %s", self.__class__.__name__, exc)
            return AgentOutput(status="failed", summary=str(exc), raw={})

    def _extract_json(self, content: str) -> dict:
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"summary": content}
```

- [ ] **Step 2: Commit**

```bash
git add src/agents/base.py
git commit -m "feat: add BaseAgent abstract class"
```

---

## Task 8: TechnicalAgent

**Files:**
- Create: `src/agents/technical.py`
- Create: `tests/unit/test_technical.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_technical.py
import pytest
from unittest.mock import AsyncMock
from src.agents.technical import TechnicalAgent
from src.data.market import MarketData
from src.models import AgentOutput
import json


def _market_data():
    return MarketData(
        ticker="PETR4.SA", price=38.50, pct_20d=2.3, volume_avg_20d=45_000_000,
        rsi=58.2, macd=0.12, macd_signal=0.08, macd_hist=0.04,
        bb_upper=40.0, bb_mid=37.0, bb_lower=34.0,
        name="Petrobras", sector="Energy",
    )


@pytest.mark.asyncio
async def test_technical_agent_returns_ok_output(mock_llm):
    response = json.dumps({
        "signal": "ALTA",
        "rsi_interpretation": "RSI em zona neutra, sem sobrecompra.",
        "macd_interpretation": "MACD acima do sinal, momentum positivo.",
        "bollinger_position": "ENTRE_BANDAS",
        "support_level": 34.0,
        "resistance_level": 40.0,
        "summary": "Tendência de alta moderada com volume acima da média.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = TechnicalAgent(llm=mock_llm)
    result = await agent.run(market_data=_market_data())

    assert isinstance(result, AgentOutput)
    assert result.status == "ok"
    assert result.raw["signal"] == "ALTA"
    assert result.raw["support_level"] == 34.0


@pytest.mark.asyncio
async def test_technical_agent_handles_llm_failure(mock_llm):
    mock_llm.complete_with_routing = AsyncMock(side_effect=Exception("timeout"))

    agent = TechnicalAgent(llm=mock_llm)
    result = await agent.run(market_data=_market_data())

    assert result.status == "failed"
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_technical.py -v
```

- [ ] **Step 3: Implementar src/agents/technical.py**

```python
from src.agents.base import BaseAgent
from src.data.market import MarketData


class TechnicalAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, market_data: MarketData) -> list[dict]:
        prompt = f"""Você é um analista técnico especializado no mercado de capitais brasileiro.

Dados técnicos de {market_data.ticker} ({market_data.name}):
- Preço atual: R$ {market_data.price:.2f}
- Variação 20 dias: {market_data.pct_20d:+.1f}%
- Volume médio 20d: {market_data.volume_avg_20d:,.0f}
- RSI (14): {market_data.rsi:.2f}
- MACD: {market_data.macd:.4f} | Signal: {market_data.macd_signal:.4f} | Hist: {market_data.macd_hist:.4f}
- Bollinger Superior: {market_data.bb_upper:.2f} | Média: {market_data.bb_mid:.2f} | Inferior: {market_data.bb_lower:.2f}

Analise e retorne APENAS este JSON (sem markdown):
{{
  "signal": "ALTA" ou "BAIXA" ou "NEUTRO",
  "rsi_interpretation": "string explicando o RSI",
  "macd_interpretation": "string explicando MACD",
  "bollinger_position": "ACIMA_SUPERIOR" ou "ENTRE_BANDAS" ou "ABAIXO_INFERIOR",
  "support_level": float,
  "resistance_level": float,
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_technical.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/technical.py tests/unit/test_technical.py
git commit -m "feat: add TechnicalAgent"
```

---

## Task 9: FundamentalAgent

**Files:**
- Create: `src/agents/fundamental.py`
- Create: `tests/unit/test_fundamental.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_fundamental.py
import pytest
from unittest.mock import AsyncMock
from src.agents.fundamental import FundamentalAgent
from src.data.fundamentus import FundamentusData
from src.models import AgentOutput
import json


def _fund_data():
    return FundamentusData(
        ticker="PETR4", pl=8.5, pvp=1.2, roe=0.183,
        divida_bruta_pl=0.8, margem_ebit=0.221,
    )


@pytest.mark.asyncio
async def test_fundamental_agent_returns_ok_output(mock_llm):
    response = json.dumps({
        "health": "BOA",
        "valuation": "BARATO",
        "roe_interpretation": "ROE de 18.3% é excelente para o setor.",
        "debt_risk": "MODERADO",
        "summary": "Empresa com fundamentos sólidos e valuation atrativo.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = FundamentalAgent(llm=mock_llm)
    result = await agent.run(fundamentals=_fund_data())

    assert result.status == "ok"
    assert result.raw["health"] == "BOA"
    assert result.raw["valuation"] == "BARATO"


@pytest.mark.asyncio
async def test_fundamental_agent_handles_llm_failure(mock_llm):
    mock_llm.complete_with_routing = AsyncMock(side_effect=Exception("error"))
    agent = FundamentalAgent(llm=mock_llm)
    result = await agent.run(fundamentals=_fund_data())
    assert result.status == "failed"
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_fundamental.py -v
```

- [ ] **Step 3: Implementar src/agents/fundamental.py**

```python
from src.agents.base import BaseAgent
from src.data.fundamentus import FundamentusData


class FundamentalAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, fundamentals: FundamentusData) -> list[dict]:
        prompt = f"""Você é um analista fundamentalista especializado no mercado brasileiro.

Dados fundamentalistas de {fundamentals.ticker}:
- P/L: {fundamentals.pl:.2f}
- P/VP: {fundamentals.pvp:.2f}
- ROE: {fundamentals.roe * 100:.1f}%
- Dívida Bruta/PL: {fundamentals.divida_bruta_pl:.2f}
- Margem EBIT: {fundamentals.margem_ebit * 100:.1f}%

Analise e retorne APENAS este JSON (sem markdown):
{{
  "health": "EXCELENTE" ou "BOA" ou "REGULAR" ou "RUIM",
  "valuation": "BARATO" ou "JUSTO" ou "CARO",
  "roe_interpretation": "string",
  "debt_risk": "BAIXO" ou "MODERADO" ou "ALTO",
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_fundamental.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/fundamental.py tests/unit/test_fundamental.py
git commit -m "feat: add FundamentalAgent"
```

---

## Task 10: SentimentAgent

**Files:**
- Create: `src/agents/sentiment.py`
- Create: `tests/unit/test_sentiment.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_sentiment.py
import pytest
from unittest.mock import AsyncMock
from src.agents.sentiment import SentimentAgent
from src.data.news import NewsData
from src.models import AgentOutput
import json


def _news_data():
    return NewsData(ticker="PETR4", headlines=[
        "Petrobras anuncia dividendos recordes",
        "PETR4 sobe 4% após resultado positivo",
        "Analistas elevam preço-alvo de Petrobras",
    ])


@pytest.mark.asyncio
async def test_sentiment_agent_returns_ok_output(mock_llm):
    response = json.dumps({
        "score": 0.72,
        "label": "POSITIVO",
        "catalysts": ["Dividendos recordes", "Elevação de preço-alvo"],
        "risks": [],
        "summary": "Sentimento positivo com catalisadores fortes de curto prazo.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = SentimentAgent(llm=mock_llm)
    result = await agent.run(news=_news_data())

    assert result.status == "ok"
    assert result.raw["score"] == 0.72
    assert result.raw["label"] == "POSITIVO"


@pytest.mark.asyncio
async def test_sentiment_agent_with_empty_news(mock_llm):
    response = json.dumps({
        "score": 0.0, "label": "NEUTRO", "catalysts": [], "risks": [],
        "summary": "Sem notícias relevantes no período.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = SentimentAgent(llm=mock_llm)
    result = await agent.run(news=NewsData(ticker="PETR4", headlines=[]))
    assert result.status == "ok"
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_sentiment.py -v
```

- [ ] **Step 3: Implementar src/agents/sentiment.py**

```python
from src.agents.base import BaseAgent
from src.data.news import NewsData


class SentimentAgent(BaseAgent):
    routing_key = "sentiment"

    def build_messages(self, news: NewsData) -> list[dict]:
        if news.headlines:
            headlines_text = "\n".join(f"- {h}" for h in news.headlines)
        else:
            headlines_text = "Nenhuma notícia encontrada nos últimos 7 dias."

        prompt = f"""Você é um analista de sentimento de mercado especializado no Brasil.

Notícias dos últimos 7 dias sobre {news.ticker}:
{headlines_text}

Analise o sentimento e retorne APENAS este JSON (sem markdown):
{{
  "score": float entre -1.0 (muito negativo) e 1.0 (muito positivo),
  "label": "MUITO_POSITIVO" ou "POSITIVO" ou "NEUTRO" ou "NEGATIVO" ou "MUITO_NEGATIVO",
  "catalysts": ["lista de catalisadores positivos identificados"],
  "risks": ["lista de riscos ou eventos negativos identificados"],
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_sentiment.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/sentiment.py tests/unit/test_sentiment.py
git commit -m "feat: add SentimentAgent"
```

---

## Task 11: BullAgent e BearAgent

**Files:**
- Create: `src/agents/debaters.py`
- Create: `tests/unit/test_debaters.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_debaters.py
import pytest
from unittest.mock import AsyncMock
from src.agents.debaters import BullAgent, BearAgent
from src.models import AgentOutput
import json


def _phase1_outputs():
    return {
        "technical": {"signal": "ALTA", "summary": "Tendência de alta moderada."},
        "fundamental": {"health": "BOA", "summary": "Fundamentos sólidos."},
        "sentiment": {"score": 0.72, "summary": "Sentimento positivo."},
    }


@pytest.mark.asyncio
async def test_bull_agent_returns_three_arguments(mock_llm):
    response = json.dumps({
        "arguments": [
            "RSI abaixo de 70 com MACD cruzando para cima indica momentum de alta.",
            "ROE de 18.3% supera a média do setor em 6 pontos percentuais.",
            "Dividendos recordes atraem fluxo de capital estrangeiro.",
        ],
        "conviction": "ALTA",
        "summary": "Tese de alta com 3 fundamentos técnicos e fundamentais sólidos.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = BullAgent(llm=mock_llm)
    result = await agent.run(phase1_outputs=_phase1_outputs(), ticker="PETR4.SA")

    assert result.status == "ok"
    assert len(result.raw["arguments"]) == 3
    assert result.raw["conviction"] == "ALTA"


@pytest.mark.asyncio
async def test_bear_agent_returns_three_arguments(mock_llm):
    response = json.dumps({
        "arguments": [
            "Dependência de commodities expõe o papel a choques externos de preço.",
            "Dívida bruta/PL de 0.8 limita capacidade de reinvestimento.",
            "Setor de petróleo enfrenta pressão regulatória crescente no Brasil.",
        ],
        "conviction": "MODERADA",
        "summary": "Riscos estruturais mitigam o potencial de alta no curto prazo.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = BearAgent(llm=mock_llm)
    result = await agent.run(phase1_outputs=_phase1_outputs(), ticker="PETR4.SA")

    assert result.status == "ok"
    assert len(result.raw["arguments"]) == 3
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_debaters.py -v
```

- [ ] **Step 3: Implementar src/agents/debaters.py**

```python
from src.agents.base import BaseAgent


def _format_phase1(outputs: dict) -> str:
    lines = []
    for name, data in outputs.items():
        summary = data.get("summary", "N/A") if isinstance(data, dict) else str(data)
        lines.append(f"- {name.capitalize()}: {summary}")
    return "\n".join(lines)


class BullAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, phase1_outputs: dict, ticker: str) -> list[dict]:
        prompt = f"""Você é um analista otimista (bull) especializado no mercado brasileiro.

Análises recebidas para {ticker}:
{_format_phase1(phase1_outputs)}

Construa a tese de ALTA mais convincente possível com base nestas análises.
Retorne APENAS este JSON (sem markdown):
{{
  "arguments": [
    "argumento 1 específico com dado ou evidência",
    "argumento 2 específico com dado ou evidência",
    "argumento 3 específico com dado ou evidência"
  ],
  "conviction": "MUITO_ALTA" ou "ALTA" ou "MODERADA",
  "summary": "2-3 frases resumindo a tese de alta em português de mercado"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)


class BearAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, phase1_outputs: dict, ticker: str) -> list[dict]:
        prompt = f"""Você é um analista pessimista (bear) especializado no mercado brasileiro.

Análises recebidas para {ticker}:
{_format_phase1(phase1_outputs)}

Construa a tese de BAIXA mais convincente possível com base nestas análises.
Retorne APENAS este JSON (sem markdown):
{{
  "arguments": [
    "argumento 1 específico com dado ou risco",
    "argumento 2 específico com dado ou risco",
    "argumento 3 específico com dado ou risco"
  ],
  "conviction": "MUITO_ALTA" ou "ALTA" ou "MODERADA",
  "summary": "2-3 frases resumindo a tese de baixa em português de mercado"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_debaters.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/debaters.py tests/unit/test_debaters.py
git commit -m "feat: add BullAgent and BearAgent"
```

---

## Task 12: RiskAgent

**Files:**
- Create: `src/agents/risk.py`
- Create: `tests/unit/test_risk.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_risk.py
import pytest
from unittest.mock import AsyncMock
from src.agents.risk import RiskAgent
from src.models import AgentOutput
import json


def _all_outputs():
    return {
        "technical": {"signal": "ALTA", "summary": "Tendência de alta."},
        "fundamental": {"health": "BOA", "debt_risk": "MODERADO", "summary": "Fundamentos ok."},
        "sentiment": {"score": 0.72, "label": "POSITIVO", "summary": "Sentimento positivo."},
        "bull": {"conviction": "ALTA", "summary": "Tese de alta sólida."},
        "bear": {"conviction": "MODERADA", "summary": "Riscos controlados."},
    }


@pytest.mark.asyncio
async def test_risk_agent_returns_valid_score(mock_llm):
    response = json.dumps({
        "risk_score": 38,
        "stop_loss_pct": 8.5,
        "max_exposure_pct": 5.0,
        "risk_label": "MODERADO",
        "main_risks": ["Volatilidade do petróleo", "Câmbio"],
        "summary": "Risco moderado com stop-loss recomendado em 8.5% abaixo do preço atual.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = RiskAgent(llm=mock_llm)
    result = await agent.run(all_outputs=_all_outputs(), ticker="PETR4.SA", volatility_pct=2.1)

    assert result.status == "ok"
    assert 0 <= result.raw["risk_score"] <= 100
    assert result.raw["stop_loss_pct"] > 0


@pytest.mark.asyncio
async def test_risk_agent_handles_failure(mock_llm):
    mock_llm.complete_with_routing = AsyncMock(side_effect=Exception("error"))
    agent = RiskAgent(llm=mock_llm)
    result = await agent.run(all_outputs=_all_outputs(), ticker="PETR4.SA", volatility_pct=2.1)
    assert result.status == "failed"
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_risk.py -v
```

- [ ] **Step 3: Implementar src/agents/risk.py**

```python
from src.agents.base import BaseAgent


class RiskAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, all_outputs: dict, ticker: str, volatility_pct: float) -> list[dict]:
        summaries = "\n".join(
            f"- {k.capitalize()}: {v.get('summary', 'N/A') if isinstance(v, dict) else str(v)}"
            for k, v in all_outputs.items()
        )
        prompt = f"""Você é um gestor de risco especializado no mercado de capitais brasileiro.

Análises para {ticker}:
{summaries}

Volatilidade histórica 20d: {volatility_pct:.2f}% ao dia

Com base nessas análises, quantifique o risco e retorne APENAS este JSON (sem markdown):
{{
  "risk_score": inteiro de 0 (risco mínimo) a 100 (risco máximo),
  "stop_loss_pct": float percentual abaixo do preço atual para stop-loss (ex: 8.5 para 8.5%),
  "max_exposure_pct": float percentual máximo do portfólio a alocar (ex: 5.0 para 5%),
  "risk_label": "MUITO_BAIXO" ou "BAIXO" ou "MODERADO" ou "ALTO" ou "MUITO_ALTO",
  "main_risks": ["risco 1", "risco 2"],
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_risk.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/risk.py tests/unit/test_risk.py
git commit -m "feat: add RiskAgent"
```

---

## Task 13: SynthesisAgent

**Files:**
- Create: `src/agents/synthesis.py`
- Create: `tests/unit/test_synthesis.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_synthesis.py
import pytest
from unittest.mock import AsyncMock
from src.agents.synthesis import SynthesisAgent
from src.models import AgentOutput
import json


def _all_outputs():
    return {
        "technical": {"signal": "ALTA", "summary": "Tendência de alta."},
        "fundamental": {"health": "BOA", "summary": "Fundamentos sólidos."},
        "sentiment": {"score": 0.72, "label": "POSITIVO", "summary": "Sentimento positivo."},
        "bull": {"conviction": "ALTA", "arguments": ["arg1", "arg2", "arg3"], "summary": "Tese bullish forte."},
        "bear": {"conviction": "MODERADA", "arguments": ["r1", "r2", "r3"], "summary": "Riscos moderados."},
        "risk": {"risk_score": 38, "stop_loss_pct": 8.5, "risk_label": "MODERADO", "summary": "Risco controlado."},
    }


@pytest.mark.asyncio
async def test_synthesis_agent_returns_valid_recommendation(mock_llm):
    response = json.dumps({
        "recommendation": "COMPRAR",
        "confidence": 0.72,
        "reasoning": "Fundamentos sólidos e sentimento positivo superam os riscos moderados.",
        "markdown": "# Análise PETR4.SA\n\n**Recomendação: COMPRAR**\n\nFundamentos sólidos...",
        "summary": "COMPRAR com 72% de confiança. Risco moderado. Stop-loss em 8.5%.",
    })
    mock_llm.complete_with_routing = AsyncMock(return_value=response)

    agent = SynthesisAgent(llm=mock_llm)
    result = await agent.run(all_outputs=_all_outputs(), ticker="PETR4.SA")

    assert result.status == "ok"
    assert result.raw["recommendation"] in ("COMPRAR", "MANTER", "VENDER")
    assert 0 <= result.raw["confidence"] <= 1
    assert "# Análise" in result.raw["markdown"]


@pytest.mark.asyncio
async def test_synthesis_agent_handles_failure(mock_llm):
    mock_llm.complete_with_routing = AsyncMock(side_effect=Exception("error"))
    agent = SynthesisAgent(llm=mock_llm)
    result = await agent.run(all_outputs=_all_outputs(), ticker="PETR4.SA")
    assert result.status == "failed"
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_synthesis.py -v
```

- [ ] **Step 3: Implementar src/agents/synthesis.py**

```python
from src.agents.base import BaseAgent


class SynthesisAgent(BaseAgent):
    routing_key = "synthesis"

    def build_messages(self, all_outputs: dict, ticker: str) -> list[dict]:
        sections = []
        for key, data in all_outputs.items():
            if not isinstance(data, dict):
                continue
            summary = data.get("summary", "N/A")
            sections.append(f"### {key.capitalize()}\n{summary}")
        analysis_block = "\n\n".join(sections)

        prompt = f"""Você é um gestor de portfólio sênior especializado no mercado brasileiro.

Síntese das análises para {ticker}:

{analysis_block}

Com base em todas essas análises, produza o relatório final e retorne APENAS este JSON (sem markdown externo):
{{
  "recommendation": "COMPRAR" ou "MANTER" ou "VENDER",
  "confidence": float entre 0.0 e 1.0,
  "reasoning": "parágrafo explicando a decisão com os principais fatores",
  "markdown": "relatório completo em Markdown com seções: Resumo, Análise Técnica, Fundamentalista, Sentimento, Debate Bull/Bear, Risco, Recomendação Final",
  "summary": "1 frase com recomendação, confiança e stop-loss em português de mercado"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_synthesis.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/agents/synthesis.py tests/unit/test_synthesis.py
git commit -m "feat: add SynthesisAgent"
```

---

## Task 14: Orchestrator

**Files:**
- Create: `src/orchestrator.py`
- Create: `tests/unit/test_orchestrator.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_orchestrator.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.orchestrator import run_analysis
from src.models import AnalysisResult, AgentOutput


def _make_agent_output(signal="ALTA", recommendation=None):
    raw = {"signal": signal, "summary": "ok", "score": 0.5}
    if recommendation:
        raw["recommendation"] = recommendation
        raw["confidence"] = 0.72
        raw["stop_loss_pct"] = 8.5
        raw["markdown"] = "# Test"
    return AgentOutput(status="ok", summary="ok", raw=raw)


@pytest.mark.asyncio
@patch("src.orchestrator.fetch_market_data")
@patch("src.orchestrator.fetch_fundamentus")
@patch("src.orchestrator.fetch_news")
async def test_run_analysis_returns_analysis_result(mock_news, mock_fund, mock_market, mock_llm):
    from src.data.market import MarketData
    from src.data.fundamentus import FundamentusData
    from src.data.news import NewsData

    mock_market.return_value = MarketData(
        ticker="PETR4.SA", price=38.50, pct_20d=2.3, volume_avg_20d=45_000_000,
        rsi=58.2, macd=0.12, macd_signal=0.08, macd_hist=0.04,
        bb_upper=40.0, bb_mid=37.0, bb_lower=34.0, name="Petrobras", sector="Energy",
    )
    mock_fund.return_value = FundamentusData(
        ticker="PETR4", pl=8.5, pvp=1.2, roe=0.183, divida_bruta_pl=0.8, margem_ebit=0.221,
    )
    mock_news.return_value = NewsData(ticker="PETR4", headlines=["Petrobras sobe 3%"])

    synth_output = _make_agent_output(recommendation="COMPRAR")
    risk_output = AgentOutput(status="ok", summary="ok", raw={
        "risk_score": 38, "stop_loss_pct": 8.5, "summary": "Risco moderado."
    })

    mock_llm.complete_with_routing = AsyncMock(return_value='{"signal":"ALTA","summary":"ok","score":0.5,"recommendation":"COMPRAR","confidence":0.72,"stop_loss_pct":8.5,"markdown":"# Test","risk_score":38}')

    result = await run_analysis("PETR4.SA", mock_llm, job_id="test123")

    assert isinstance(result, AnalysisResult)
    assert result.ticker == "PETR4.SA"
    assert result.recommendation in ("COMPRAR", "MANTER", "VENDER")
    assert result.job_id == "test123"
    assert result.elapsed_seconds >= 0
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_orchestrator.py -v
```

- [ ] **Step 3: Implementar src/orchestrator.py**

```python
from __future__ import annotations
import asyncio
import time
from datetime import datetime, timezone

from src.agents.debaters import BullAgent, BearAgent
from src.agents.fundamental import FundamentalAgent
from src.agents.risk import RiskAgent
from src.agents.sentiment import SentimentAgent
from src.agents.synthesis import SynthesisAgent
from src.agents.technical import TechnicalAgent
from src.data.fundamentus import fetch_fundamentus
from src.data.market import fetch_market_data
from src.data.news import fetch_news
from src.llm.client import LLMClient
from src.models import AgentOutput, AnalysisResult


def _safe_output(result: AgentOutput | BaseException) -> AgentOutput:
    if isinstance(result, BaseException):
        return AgentOutput(status="failed", summary=str(result), raw={})
    return result


async def run_analysis(
    ticker: str,
    llm: LLMClient,
    job_id: str,
    progress_callback=None,
) -> AnalysisResult:
    start = time.monotonic()

    async def notify(agent: str, status: str):
        if progress_callback:
            await progress_callback(agent, status, time.monotonic() - start)

    # — Coleta de dados (em paralelo com asyncio para I/O) —
    market_data, fundamentals, news = await asyncio.gather(
        asyncio.get_event_loop().run_in_executor(None, fetch_market_data, ticker),
        asyncio.get_event_loop().run_in_executor(None, fetch_fundamentus, ticker),
        fetch_news(ticker, ticker.replace(".SA", "")),
        return_exceptions=True,
    )

    # — Fase 1: 3 agentes em paralelo —
    await notify("technical", "running")
    await notify("fundamental", "running")
    await notify("sentiment", "running")

    tech_out, fund_out, sent_out = await asyncio.gather(
        TechnicalAgent(llm).run(market_data=market_data if not isinstance(market_data, BaseException) else None),
        FundamentalAgent(llm).run(fundamentals=fundamentals if not isinstance(fundamentals, BaseException) else None),
        SentimentAgent(llm).run(news=news if not isinstance(news, BaseException) else None),
        return_exceptions=True,
    )
    tech_out = _safe_output(tech_out)
    fund_out = _safe_output(fund_out)
    sent_out = _safe_output(sent_out)

    await notify("technical", "done")
    await notify("fundamental", "done")
    await notify("sentiment", "done")

    phase1 = {
        "technical": tech_out.raw,
        "fundamental": fund_out.raw,
        "sentiment": sent_out.raw,
    }

    # — Fase 2: Sequencial —
    await notify("bull", "running")
    bull_out = _safe_output(await BullAgent(llm).run(phase1_outputs=phase1, ticker=ticker))
    await notify("bull", "done")

    await notify("bear", "running")
    bear_out = _safe_output(await BearAgent(llm).run(phase1_outputs=phase1, ticker=ticker))
    await notify("bear", "done")

    all_outputs = {**phase1, "bull": bull_out.raw, "bear": bear_out.raw}

    volatility_pct = 0.0
    if not isinstance(market_data, BaseException):
        import numpy as np
        import pandas as pd
        # Volatilidade não está em MarketData diretamente — estimamos via RSI/preço
        volatility_pct = abs(market_data.pct_20d) / 20

    await notify("risk", "running")
    risk_out = _safe_output(await RiskAgent(llm).run(
        all_outputs=all_outputs, ticker=ticker, volatility_pct=volatility_pct
    ))
    await notify("risk", "done")

    all_outputs["risk"] = risk_out.raw

    await notify("synthesis", "running")
    synth_out = _safe_output(await SynthesisAgent(llm).run(all_outputs=all_outputs, ticker=ticker))
    await notify("synthesis", "done")

    recommendation = synth_out.raw.get("recommendation", "MANTER")
    if recommendation not in ("COMPRAR", "MANTER", "VENDER"):
        recommendation = "MANTER"

    return AnalysisResult(
        job_id=job_id,
        ticker=ticker,
        timestamp=datetime.now(timezone.utc),
        recommendation=recommendation,
        confidence=float(synth_out.raw.get("confidence", 0.5)),
        risk_score=int(risk_out.raw.get("risk_score", 50)),
        stop_loss_pct=float(risk_out.raw.get("stop_loss_pct", 10.0)),
        agents={
            "technical": tech_out,
            "fundamental": fund_out,
            "sentiment": sent_out,
            "bull": bull_out,
            "bear": bear_out,
            "risk": risk_out,
            "synthesis": synth_out,
        },
        elapsed_seconds=time.monotonic() - start,
        cost_usd=0.0,
    )
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_orchestrator.py -v
```

- [ ] **Step 5: Commit**

```bash
git add src/orchestrator.py tests/unit/test_orchestrator.py
git commit -m "feat: add async orchestrator with parallel phase 1"
```

---

## Task 15: FastAPI

**Files:**
- Create: `src/api.py`
- Create: `tests/unit/test_api.py`

- [ ] **Step 1: Escrever o teste**

```python
# tests/unit/test_api.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from src.api import app


def test_health_endpoint():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@patch("src.api.run_analysis")
@patch("src.api.LLMClient")
def test_post_analyze_returns_job_id(mock_llm_cls, mock_run):
    mock_run.return_value = AsyncMock()
    client = TestClient(app)
    resp = client.post("/analyze", json={"ticker": "PETR4.SA"})
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    assert data["ticker"] == "PETR4.SA"
    assert data["status"] == "running"


@patch("src.api.LLMClient")
def test_post_analyze_rejects_empty_ticker(mock_llm_cls):
    client = TestClient(app)
    resp = client.post("/analyze", json={"ticker": ""})
    assert resp.status_code == 422
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
poetry run pytest tests/unit/test_api.py -v
```

- [ ] **Step 3: Implementar src/api.py**

```python
from __future__ import annotations
import asyncio
import os
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from pydantic import field_validator

from src.llm.client import LLMClient
from src.models import AnalysisRequest, AnalysisResult, JobStatus, WsEvent

load_dotenv()

app = FastAPI(title="FinSwarm", version="0.1.0")

_jobs: dict[str, asyncio.Queue] = {}
_results: dict[str, AnalysisResult | Exception] = {}


class AnalysisRequestValidated(AnalysisRequest):
    @field_validator("ticker")
    @classmethod
    def ticker_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("ticker não pode ser vazio")
        return v.strip().upper()


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/analyze", status_code=202, response_model=JobStatus)
async def start_analysis(request: AnalysisRequestValidated, background_tasks: BackgroundTasks):
    job_id = uuid4().hex[:8]
    queue: asyncio.Queue = asyncio.Queue()
    _jobs[job_id] = queue
    llm = LLMClient()
    background_tasks.add_task(_run_and_store, job_id, request.ticker, llm, queue)
    return JobStatus(job_id=job_id, ticker=request.ticker, status="running")


async def _run_and_store(job_id: str, ticker: str, llm: LLMClient, queue: asyncio.Queue):
    from src.orchestrator import run_analysis

    async def push_event(agent: str, status: str, elapsed: float):
        event_type = "agent_start" if status == "running" else "agent_done"
        await queue.put(WsEvent(event=event_type, agent=agent, elapsed=elapsed))

    try:
        result = await run_analysis(ticker, llm, job_id=job_id, progress_callback=push_event)
        _results[job_id] = result
        await queue.put(WsEvent(event="done", result=result, elapsed=result.elapsed_seconds))
    except Exception as exc:
        _results[job_id] = exc
        await queue.put(WsEvent(event="error", message=str(exc)))


@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    queue = _jobs.get(job_id)
    if queue is None:
        await websocket.send_json({"event": "error", "message": "job_id não encontrado"})
        await websocket.close()
        return
    try:
        while True:
            event: WsEvent = await asyncio.wait_for(queue.get(), timeout=120)
            await websocket.send_text(event.model_dump_json(exclude_none=True))
            if event.event in ("done", "error"):
                break
    except asyncio.TimeoutError:
        await websocket.send_json({"event": "error", "message": "timeout"})
    except WebSocketDisconnect:
        pass
    finally:
        _jobs.pop(job_id, None)
```

- [ ] **Step 4: Rodar para verificar que passa**

```bash
poetry run pytest tests/unit/test_api.py -v
```

- [ ] **Step 5: Rodar servidor manualmente e testar**

```bash
poetry run uvicorn src.api:app --reload --port 8000
```

Em outro terminal:
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "PETR4.SA"}'
```

Esperado: `{"job_id":"...", "ticker":"PETR4.SA", "status":"running"}`

- [ ] **Step 6: Commit**

```bash
git add src/api.py tests/unit/test_api.py
git commit -m "feat: add FastAPI with POST /analyze and WebSocket /ws/{job_id}"
```

---

## Task 16: Teste de Integração

**Files:**
- Create: `tests/integration/test_full_analysis.py`

- [ ] **Step 1: Verificar que OPENROUTER_API_KEY está no .env**

```bash
grep OPENROUTER_API_KEY .env
```

Esperado: linha com a chave real.

- [ ] **Step 2: Implementar o teste de integração**

```python
# tests/integration/test_full_analysis.py
import os
import pytest
from src.llm.client import LLMClient
from src.orchestrator import run_analysis
from src.models import AnalysisResult


pytestmark = pytest.mark.integration


@pytest.fixture
def llm():
    if not os.environ.get("OPENROUTER_API_KEY"):
        pytest.skip("OPENROUTER_API_KEY não configurada")
    return LLMClient()


@pytest.mark.asyncio
async def test_full_analysis_petr4(llm):
    result = await run_analysis("PETR4.SA", llm, job_id="integration-test")

    assert isinstance(result, AnalysisResult)
    assert result.ticker == "PETR4.SA"
    assert result.recommendation in ("COMPRAR", "MANTER", "VENDER")
    assert 0.0 <= result.confidence <= 1.0
    assert 0 <= result.risk_score <= 100
    assert result.elapsed_seconds < 120
    assert len(result.agents) == 7

    failed = [k for k, v in result.agents.items() if v.status == "failed"]
    assert len(failed) <= 2, f"Muitos agentes falharam: {failed}"
```

- [ ] **Step 3: Rodar o teste de integração**

```bash
poetry run pytest tests/integration/ -v -m integration
```

Esperado: análise completa de PETR4.SA em menos de 120 segundos, com pelo menos 5 dos 7 agentes com status "ok".

- [ ] **Step 4: Commit final**

```bash
git add tests/integration/test_full_analysis.py
git commit -m "test: add integration test for full PETR4 analysis"
```

---

## Self-Review

**Cobertura do spec:**
- ✅ POST /analyze assíncrono com job_id
- ✅ WebSocket /ws/{job_id} com eventos de progresso
- ✅ GET /health
- ✅ 7 agentes (Técnico, Fundamental, Sentimento, Bull, Bear, Risco, Síntese)
- ✅ asyncio.gather() na fase 1 (paralelo)
- ✅ Sequencial na fase 2
- ✅ Routing com fallback e backoff exponencial
- ✅ TTL cache em memória
- ✅ lib ta para indicadores técnicos locais
- ✅ Fundamentus scraper para dados B3
- ✅ GNews para notícias
- ✅ Pydantic v2 em todos os outputs
- ✅ Falha graceful por agente (nunca aborta a análise)
- ✅ Testes unitários com AsyncMock
- ✅ Teste de integração com PETR4.SA

**Tipos consistentes entre tasks:**
- `AgentOutput` definido em Task 2, usado em Tasks 8-15 ✅
- `LLMClient.complete_with_routing(routing_key, messages)` definido em Task 3, usado em BaseAgent Task 7 ✅
- `AnalysisResult.job_id` definido em Task 2, preenchido em Task 14 ✅
- `WsEvent` definido em Task 2, usado em Task 15 ✅
