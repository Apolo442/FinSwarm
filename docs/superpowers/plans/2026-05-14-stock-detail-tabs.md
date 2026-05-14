# StockDetail com 8 abas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/stock/:ticker` num hub de decisão com 7 abas funcionais (Visão geral, Finanças, Notícias, Comunidade FinSwarm, Sinais técnicos, Previsões, Sazonais) + 1 placeholder (Títulos), com cache de 2 camadas no backend e carregamento progressivo no frontend.

**Architecture:** Backend FastAPI com 6 endpoints REST sob `/stock/{ticker}/{section}`, módulo `cache.py` (memória via `cachetools.TTLCache` + SQLite persistente), serviços por aba em `stock_service.py`, cálculos puros pandas/numpy em `technicals.py` e `seasonals.py`. Frontend React com cache de sessão por aba, panels lazy, gráficos SVG inline, estética glass do FinSwarm v2.

**Tech Stack:** Python 3.12 / FastAPI / yfinance / fundamentus / aiosqlite / **cachetools (nova dep)** · React 18 / TypeScript / Tailwind v4 / lightweight-charts (já instalado) · Vitest + RTL · pytest

**Spec:** `docs/superpowers/specs/2026-05-14-stock-detail-tabs-design.md`
**Mockup:** `.superpowers/brainstorm/37617-1778783869/content/tabs-v2.html`
**Branch:** `feat/web`

---

## Fase A — Backend: cache, cálculos puros, models

### Task A1: Adicionar dependência cachetools

**Files:**
- Modify: `pyproject.toml`

- [ ] **Step 1: Adicionar dependência**

Editar `pyproject.toml`, na seção `[tool.poetry.dependencies]`:

```toml
cachetools = "^5.3"
```

- [ ] **Step 2: Instalar**

```bash
cd /home/mateus/finswarm && poetry install
```

Expected: `cachetools` instalado sem conflitos.

- [ ] **Step 3: Commit**

```bash
git add pyproject.toml poetry.lock
git commit -m "deps: add cachetools for in-memory TTL cache"
```

---

### Task A2: Módulo `src/cache.py` — cache 2 camadas

**Files:**
- Create: `src/cache.py`
- Test: `tests/test_cache.py`

- [ ] **Step 1: Escrever teste do TTLCache em memória**

`tests/test_cache.py`:

```python
import asyncio
import pytest
from datetime import timedelta
from src.cache import get_or_fetch, init_cache_db, _memory_cache


@pytest.fixture(autouse=True)
async def reset_cache(tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "test_cache.db"))
    _memory_cache.clear()
    await init_cache_db()
    yield


@pytest.mark.asyncio
async def test_memory_cache_hit():
    calls = 0
    def fetcher():
        nonlocal calls
        calls += 1
        return {"x": 1}
    r1 = await get_or_fetch("k1", timedelta(seconds=60), fetcher)
    r2 = await get_or_fetch("k1", timedelta(seconds=60), fetcher)
    assert r1 == r2 == {"x": 1}
    assert calls == 1
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_cache.py::test_memory_cache_hit -v
```
Expected: FAIL `ModuleNotFoundError: src.cache`.

- [ ] **Step 3: Implementar `src/cache.py`**

```python
from __future__ import annotations
import asyncio, gzip, json, time
from datetime import timedelta
from typing import Any, Callable, Awaitable
from pathlib import Path
import aiosqlite
from cachetools import TTLCache

_DB_PATH = "data/stock_cache.db"
_memory_cache: TTLCache = TTLCache(maxsize=512, ttl=600)


async def init_cache_db() -> None:
    Path(_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS cache_entries (
              key TEXT PRIMARY KEY,
              value BLOB NOT NULL,
              expires_at INTEGER NOT NULL
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at)")
        await db.execute("DELETE FROM cache_entries WHERE expires_at < ?", (int(time.time()),))
        await db.commit()


async def _sqlite_get(key: str) -> Any | None:
    async with aiosqlite.connect(_DB_PATH) as db:
        async with db.execute("SELECT value, expires_at FROM cache_entries WHERE key = ?", (key,)) as cur:
            row = await cur.fetchone()
    if row is None: return None
    value_blob, expires_at = row
    if expires_at < int(time.time()): return None
    return json.loads(gzip.decompress(value_blob))


async def _sqlite_put(key: str, value: Any, ttl: timedelta) -> None:
    blob = gzip.compress(json.dumps(value, default=str).encode())
    expires_at = int(time.time() + ttl.total_seconds())
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO cache_entries (key, value, expires_at) VALUES (?, ?, ?)",
            (key, blob, expires_at),
        )
        await db.commit()


async def get_or_fetch(
    key: str,
    ttl: timedelta,
    fetcher: Callable[[], Any] | Callable[[], Awaitable[Any]],
) -> Any:
    if key in _memory_cache:
        return _memory_cache[key]
    value = await _sqlite_get(key)
    if value is not None:
        _memory_cache[key] = value
        return value
    result = fetcher()
    if asyncio.iscoroutine(result):
        result = await result
    else:
        result = await asyncio.to_thread(lambda: result) if False else result
    await _sqlite_put(key, result, ttl)
    _memory_cache[key] = result
    return result
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_cache.py -v
```
Expected: PASS.

- [ ] **Step 5: Adicionar testes para SQLite hit, miss e TTL expiry**

Acrescentar em `tests/test_cache.py`:

```python
@pytest.mark.asyncio
async def test_sqlite_hit_after_memory_clear():
    calls = 0
    def fetcher():
        nonlocal calls
        calls += 1
        return {"y": 2}
    await get_or_fetch("k2", timedelta(seconds=60), fetcher)
    _memory_cache.clear()
    r2 = await get_or_fetch("k2", timedelta(seconds=60), fetcher)
    assert r2 == {"y": 2}
    assert calls == 1


@pytest.mark.asyncio
async def test_ttl_expiry_refetches():
    calls = 0
    def fetcher():
        nonlocal calls; calls += 1
        return calls
    r1 = await get_or_fetch("k3", timedelta(seconds=-1), fetcher)
    _memory_cache.clear()
    r2 = await get_or_fetch("k3", timedelta(seconds=60), fetcher)
    assert r1 == 1 and r2 == 2 and calls == 2


@pytest.mark.asyncio
async def test_async_fetcher_supported():
    async def afetcher():
        return {"async": True}
    r = await get_or_fetch("k4", timedelta(seconds=60), afetcher)
    assert r == {"async": True}
```

```bash
poetry run pytest tests/test_cache.py -v
```
Expected: 4 testes passam.

- [ ] **Step 6: Commit**

```bash
git add src/cache.py tests/test_cache.py
git commit -m "feat(cache): add 2-layer TTL cache (memory + SQLite)"
```

---

### Task A3: Módulo `src/technicals.py` — osciladores

**Files:**
- Create: `src/technicals.py`
- Test: `tests/test_technicals.py`

- [ ] **Step 1: Escrever teste com OHLCV fixo**

`tests/test_technicals.py`:

```python
import pandas as pd
import numpy as np
from src.technicals import rsi, macd, sma, ema, stoch, cci, williams_r


def fake_close(values):
    return pd.Series(values, dtype=float)


def test_rsi_overbought():
    # 14 períodos altistas → RSI próximo de 100
    s = fake_close([1+i*0.5 for i in range(20)])
    val = rsi(s, period=14).iloc[-1]
    assert val > 70


def test_rsi_oversold():
    s = fake_close([20-i*0.5 for i in range(20)])
    val = rsi(s, period=14).iloc[-1]
    assert val < 30


def test_sma_simple():
    s = fake_close([1, 2, 3, 4, 5])
    assert sma(s, 5).iloc[-1] == 3.0


def test_ema_recent_weighted():
    s = fake_close([1.0]*20 + [10.0])
    val = ema(s, 5).iloc[-1]
    assert val > 3.0


def test_macd_signal_line():
    s = fake_close(list(range(50)))
    line, signal, hist = macd(s)
    assert not np.isnan(line.iloc[-1])
    assert not np.isnan(signal.iloc[-1])
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_technicals.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar `src/technicals.py`**

```python
from __future__ import annotations
import pandas as pd
import numpy as np


def sma(close: pd.Series, period: int) -> pd.Series:
    return close.rolling(period).mean()


def ema(close: pd.Series, period: int) -> pd.Series:
    return close.ewm(span=period, adjust=False).mean()


def wma(close: pd.Series, period: int) -> pd.Series:
    weights = np.arange(1, period + 1)
    return close.rolling(period).apply(lambda w: np.dot(w, weights) / weights.sum(), raw=True)


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    line = ema(close, fast) - ema(close, slow)
    sig = ema(line, signal)
    hist = line - sig
    return line, sig, hist


def stoch(high: pd.Series, low: pd.Series, close: pd.Series, k: int = 14, d: int = 3):
    hh = high.rolling(k).max()
    ll = low.rolling(k).min()
    pk = 100 * (close - ll) / (hh - ll).replace(0, np.nan)
    pd_ = pk.rolling(d).mean()
    return pk, pd_


def cci(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20) -> pd.Series:
    tp = (high + low + close) / 3
    mean = tp.rolling(period).mean()
    md = (tp - mean).abs().rolling(period).mean()
    return (tp - mean) / (0.015 * md.replace(0, np.nan))


def williams_r(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    hh = high.rolling(period).max()
    ll = low.rolling(period).min()
    return -100 * (hh - close) / (hh - ll).replace(0, np.nan)


def roc(close: pd.Series, period: int = 12) -> pd.Series:
    return ((close - close.shift(period)) / close.shift(period)) * 100


def awesome_oscillator(high: pd.Series, low: pd.Series) -> pd.Series:
    mp = (high + low) / 2
    return sma(mp, 5) - sma(mp, 34)
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_technicals.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/technicals.py tests/test_technicals.py
git commit -m "feat(technicals): add oscillators and moving averages"
```

---

### Task A4: Pivôs e agregador de sinais

**Files:**
- Modify: `src/technicals.py`
- Modify: `tests/test_technicals.py`

- [ ] **Step 1: Escrever testes**

Acrescentar em `tests/test_technicals.py`:

```python
from src.technicals import classic_pivots, fibonacci_pivots, camarilla_pivots, compute_signals


def test_classic_pivots():
    p = classic_pivots(high=10, low=8, close=9)
    assert p["p"] == 9.0
    assert p["s1"] == 8.0  # 2P - H
    assert p["r1"] == 10.0  # 2P - L


def test_fibonacci_pivots():
    p = fibonacci_pivots(high=10, low=8, close=9)
    assert p["p"] == 9.0
    assert p["s1"] < p["p"] < p["r1"]


def test_compute_signals_returns_summary():
    np.random.seed(42)
    n = 250
    df = pd.DataFrame({
        "High": np.random.uniform(20, 25, n),
        "Low": np.random.uniform(18, 20, n),
        "Close": np.random.uniform(19, 24, n),
        "Open": np.random.uniform(19, 24, n),
        "Volume": np.random.randint(1e6, 1e7, n),
    })
    out = compute_signals(df)
    assert "summary" in out and "oscillators" in out and "moving_averages" in out and "pivots" in out
    assert out["summary"]["signal"] in ("STRONG_BUY","BUY","NEUTRAL","SELL","STRONG_SELL")
    assert len(out["oscillators"]) >= 5
    assert len(out["moving_averages"]) >= 5
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_technicals.py::test_classic_pivots -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar pivôs e agregador em `src/technicals.py`**

Acrescentar:

```python
def classic_pivots(high: float, low: float, close: float) -> dict:
    p = (high + low + close) / 3
    return {
        "method": "classic", "p": round(p, 2),
        "r1": round(2*p - low, 2),  "s1": round(2*p - high, 2),
        "r2": round(p + (high - low), 2), "s2": round(p - (high - low), 2),
        "r3": round(high + 2*(p - low), 2), "s3": round(low - 2*(high - p), 2),
    }


def fibonacci_pivots(high: float, low: float, close: float) -> dict:
    p = (high + low + close) / 3
    rng = high - low
    return {
        "method": "fibonacci", "p": round(p, 2),
        "r1": round(p + 0.382 * rng, 2), "s1": round(p - 0.382 * rng, 2),
        "r2": round(p + 0.618 * rng, 2), "s2": round(p - 0.618 * rng, 2),
        "r3": round(p + 1.0   * rng, 2), "s3": round(p - 1.0   * rng, 2),
    }


def camarilla_pivots(high: float, low: float, close: float) -> dict:
    rng = high - low
    return {
        "method": "camarilla", "p": round(close, 2),
        "r1": round(close + rng * 1.1/12, 2), "s1": round(close - rng * 1.1/12, 2),
        "r2": round(close + rng * 1.1/6, 2),  "s2": round(close - rng * 1.1/6, 2),
        "r3": round(close + rng * 1.1/4, 2),  "s3": round(close - rng * 1.1/4, 2),
    }


def woodie_pivots(high: float, low: float, close: float) -> dict:
    p = (high + low + 2*close) / 4
    return {
        "method": "woodie", "p": round(p, 2),
        "r1": round(2*p - low, 2), "s1": round(2*p - high, 2),
        "r2": round(p + (high - low), 2), "s2": round(p - (high - low), 2),
        "r3": round(high + 2*(p - low), 2), "s3": round(low - 2*(high - p), 2),
    }


def demark_pivots(open_: float, high: float, low: float, close: float) -> dict:
    if close < open_:   x = high + 2*low + close
    elif close > open_: x = 2*high + low + close
    else:               x = high + low + 2*close
    p = x / 4
    return {
        "method": "demark", "p": round(p, 2),
        "r1": round(x/2 - low, 2), "s1": round(x/2 - high, 2),
        "r2": None, "s2": None, "r3": None, "s3": None,
    }


def _signal_for_rsi(v: float) -> str:
    if v < 30: return "BUY"
    if v > 70: return "SELL"
    return "NEUTRAL"

def _signal_for_macd(line: float, sig: float) -> str:
    if line > sig + 0.1: return "BUY"
    if line < sig - 0.1: return "SELL"
    return "NEUTRAL"

def _signal_for_ma(price: float, ma: float) -> str:
    diff = (price - ma) / ma if ma else 0
    if diff > 0.01: return "BUY"
    if diff < -0.01: return "SELL"
    return "NEUTRAL"


def compute_signals(df: pd.DataFrame) -> dict:
    """df precisa de colunas Open, High, Low, Close, Volume."""
    close = df["Close"]; high = df["High"]; low = df["Low"]; open_ = df["Open"]

    rsi_v = float(rsi(close, 14).iloc[-1])
    line, sig, _ = macd(close)
    macd_l = float(line.iloc[-1]); macd_s = float(sig.iloc[-1])
    pk, pd_ = stoch(high, low, close)
    stoch_v = float(pk.iloc[-1])
    cci_v = float(cci(high, low, close).iloc[-1])
    wr_v  = float(williams_r(high, low, close).iloc[-1])
    roc_v = float(roc(close).iloc[-1])
    ao_v  = float(awesome_oscillator(high, low).iloc[-1])

    price = float(close.iloc[-1])
    mas = {
        "SMA (5)":   float(sma(close, 5).iloc[-1]),
        "SMA (10)":  float(sma(close, 10).iloc[-1]),
        "SMA (20)":  float(sma(close, 20).iloc[-1]),
        "SMA (50)":  float(sma(close, 50).iloc[-1]),
        "SMA (200)": float(sma(close, 200).iloc[-1]) if len(close) >= 200 else float("nan"),
        "EMA (20)":  float(ema(close, 20).iloc[-1]),
        "EMA (50)":  float(ema(close, 50).iloc[-1]),
        "WMA (20)":  float(wma(close, 20).iloc[-1]),
    }

    oscillators = [
        {"name": "RSI (14)",       "value": round(rsi_v, 2), "signal": _signal_for_rsi(rsi_v)},
        {"name": "MACD (12,26)",   "value": round(macd_l, 2), "signal": _signal_for_macd(macd_l, macd_s)},
        {"name": "Stochastic %K",  "value": round(stoch_v, 1),
         "signal": "BUY" if stoch_v < 20 else "SELL" if stoch_v > 80 else "NEUTRAL"},
        {"name": "CCI (20)",       "value": round(cci_v, 1),
         "signal": "BUY" if cci_v < -100 else "SELL" if cci_v > 100 else "NEUTRAL"},
        {"name": "Williams %R",    "value": round(wr_v, 1),
         "signal": "BUY" if wr_v < -80 else "SELL" if wr_v > -20 else "NEUTRAL"},
        {"name": "ROC",            "value": round(roc_v, 2),
         "signal": "BUY" if roc_v > 1 else "SELL" if roc_v < -1 else "NEUTRAL"},
        {"name": "Awesome Osc.",   "value": round(ao_v, 2),
         "signal": "BUY" if ao_v > 0 else "SELL" if ao_v < 0 else "NEUTRAL"},
    ]
    moving_averages = [
        {"name": name, "value": round(v, 2) if not pd.isna(v) else None,
         "signal": _signal_for_ma(price, v) if not pd.isna(v) else "NEUTRAL"}
        for name, v in mas.items()
    ]

    counts = {"BUY": 0, "SELL": 0, "NEUTRAL": 0}
    for x in oscillators + moving_averages:
        counts[x["signal"]] += 1
    total = sum(counts.values())
    buy_pct = counts["BUY"] / total
    sell_pct = counts["SELL"] / total
    if   sell_pct >= 0.7: summary_signal = "STRONG_SELL"
    elif sell_pct >= 0.5: summary_signal = "SELL"
    elif buy_pct  >= 0.7: summary_signal = "STRONG_BUY"
    elif buy_pct  >= 0.5: summary_signal = "BUY"
    else:                 summary_signal = "NEUTRAL"

    prev = df.iloc[-2]
    pivots = [
        classic_pivots(float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
        fibonacci_pivots(float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
        camarilla_pivots(float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
        woodie_pivots(float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
        demark_pivots(float(prev["Open"]), float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
    ]

    return {
        "summary": {"signal": summary_signal, "today": summary_signal,
                    "week": summary_signal, "month": summary_signal,
                    "counts": counts},
        "oscillators": oscillators,
        "moving_averages": moving_averages,
        "pivots": pivots,
    }
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_technicals.py -v
```
Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add src/technicals.py tests/test_technicals.py
git commit -m "feat(technicals): add pivots and aggregated signals"
```

---

### Task A5: Módulo `src/seasonals.py`

**Files:**
- Create: `src/seasonals.py`
- Test: `tests/test_seasonals.py`

- [ ] **Step 1: Escrever teste**

`tests/test_seasonals.py`:

```python
import pandas as pd
import numpy as np
from src.seasonals import compute_seasonals


def test_compute_seasonals_returns_12_months():
    dates = pd.date_range("2021-01-01", "2025-12-31", freq="ME")
    np.random.seed(0)
    df = pd.DataFrame({"Close": np.random.uniform(20, 30, len(dates))}, index=dates)
    out = compute_seasonals(df)
    assert len(out["monthly_avg_5y"]) == 12
    assert all(1 <= m["month"] <= 12 for m in out["monthly_avg_5y"])
    assert all("avg_return_pct" in m for m in out["monthly_avg_5y"])
    assert len(out["years"]) >= 1
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_seasonals.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/seasonals.py`:

```python
from __future__ import annotations
import pandas as pd


def compute_seasonals(monthly_df: pd.DataFrame) -> dict:
    """monthly_df: DataFrame indexado por data, com coluna 'Close'."""
    s = monthly_df.copy()
    s.index = pd.to_datetime(s.index)
    s["return_pct"] = s["Close"].pct_change() * 100
    s["month"] = s.index.month
    s["year"] = s.index.year

    monthly_avg = (
        s.groupby("month")["return_pct"].mean().round(2)
         .reset_index().rename(columns={"return_pct": "avg_return_pct"})
    )
    years = []
    for year, grp in s.groupby("year"):
        data = grp[["month", "return_pct"]].dropna().to_dict(orient="records")
        for d in data:
            d["return_pct"] = round(d["return_pct"], 2)
        years.append({"year": int(year), "data": data})

    return {
        "monthly_avg_5y": monthly_avg.to_dict(orient="records"),
        "years": years,
    }
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_seasonals.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seasonals.py tests/test_seasonals.py
git commit -m "feat(seasonals): add monthly returns aggregator"
```

---

### Task A6: Pydantic models

**Files:**
- Modify: `src/models.py`

- [ ] **Step 1: Adicionar response models**

No final de `src/models.py`:

```python
from typing import Literal


class QuoteData(BaseModel):
    price: float; prev_close: float
    change: float; change_pct: float
    volume: int | None = None; mkt_cap: float | None = None
    currency: str = "BRL"


class ProfileData(BaseModel):
    long_name: str | None = None; summary: str | None = None
    ceo: str | None = None; founded: int | None = None
    employees: int | None = None; website: str | None = None
    sector: str | None = None; industry: str | None = None


class KPIData(BaseModel):
    mkt_cap: float | None = None; div_yield: float | None = None
    pl_12m: float | None = None;  eps_12m: float | None = None
    beta: float | None = None;    volatility: float | None = None
    last_quarter_profit: float | None = None


class EarningsRow(BaseModel):
    date: str | None = None; period: str | None = None
    eps_reported: float | None = None;     eps_estimate: float | None = None
    eps_surprise_pct: float | None = None
    revenue_reported: float | None = None; revenue_estimate: float | None = None
    revenue_surprise_pct: float | None = None


class ShareholdersData(BaseModel):
    closely_held_pct: float | None = None
    free_float_pct: float | None = None
    total_shares: float | None = None


class SeasonalMonth(BaseModel):
    month: int; avg_return_pct: float


class TechnicalsSummary(BaseModel):
    signal: str; today: str; week: str; month: str
    counts: dict[str, int] = {}


class ForecastSummary(BaseModel):
    target_mean: float | None = None
    target_high: float | None = None
    target_low: float | None = None
    target_median: float | None = None
    current: float | None = None
    recommendations: dict[str, int] = {}


class NewsItem(BaseModel):
    title: str; source: str = ""; url: str | None = None
    published_at: str | None = None; summary: str | None = None
    sentiment: Literal["POS", "NEG", "NEU"] | None = None
    sentiment_score: int | None = None


class OverviewResponse(BaseModel):
    ticker: str
    quote: QuoteData
    profile: ProfileData
    kpis: KPIData
    last_earnings: EarningsRow | None = None
    next_earnings: dict | None = None
    shareholders: ShareholdersData
    seasonals_mini: list[SeasonalMonth]
    news_preview: list[NewsItem]
    technicals_summary: TechnicalsSummary
    forecast_summary: ForecastSummary


class CapitalStructure(BaseModel):
    mkt_cap: float | None = None; debt: float | None = None
    cash: float | None = None;    minority_interest: float | None = None
    enterprise_value: float | None = None


class ValuationData(BaseModel):
    pl: float | None = None; ps: float | None = None
    pb: float | None = None; ev_ebitda: float | None = None
    revenue: float | None = None; net_income: float | None = None


class GrowthYear(BaseModel):
    year: int; revenue: float | None = None


class ProfitabilityData(BaseModel):
    roe: float | None = None; roa: float | None = None
    net_margin: float | None = None; ebit_margin: float | None = None


class DividendYear(BaseModel):
    year: int; dps: float | None = None; dy_pct: float | None = None


class HealthYear(BaseModel):
    year: int; loans: float | None = None
    deposits: float | None = None; provisions: float | None = None


class FinancialsResponse(BaseModel):
    facts: KPIData
    capital_structure: CapitalStructure
    valuation: ValuationData
    growth: list[GrowthYear]
    profitability: ProfitabilityData
    dividends_history: list[DividendYear]
    next_dividend: dict | None = None
    financial_health: list[HealthYear]
    estimates: list[EarningsRow]


class NewsResponse(BaseModel):
    items: list[NewsItem]
    next_cursor: str | None = None


class PivotRow(BaseModel):
    method: str; p: float | None = None
    r1: float | None = None; r2: float | None = None; r3: float | None = None
    s1: float | None = None; s2: float | None = None; s3: float | None = None


class IndicatorRow(BaseModel):
    name: str; value: float | None = None; signal: str


class TechnicalsResponse(BaseModel):
    summary: TechnicalsSummary
    oscillators: list[IndicatorRow]
    moving_averages: list[IndicatorRow]
    pivots: list[PivotRow]


class ForecastResponse(BaseModel):
    price_target: ForecastSummary
    recommendations: dict[str, int]
    eps_history: list[EarningsRow]
    revenue_history: list[EarningsRow]
    next_eps_estimate: float | None = None
    next_revenue_estimate: float | None = None


class SeasonalYear(BaseModel):
    year: int
    data: list[dict]


class SeasonalsResponse(BaseModel):
    monthly_avg_5y: list[SeasonalMonth]
    years: list[SeasonalYear]
```

- [ ] **Step 2: Verificar imports e tipos**

```bash
poetry run python -c "from src.models import OverviewResponse, FinancialsResponse, NewsResponse, TechnicalsResponse, ForecastResponse, SeasonalsResponse; print('OK')"
```
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add src/models.py
git commit -m "feat(models): add response models for stock detail endpoints"
```

---

### Task A7: Sentiment classifier batch

**Files:**
- Create: `src/sentiment.py`
- Test: `tests/test_sentiment.py`

- [ ] **Step 1: Escrever teste com LLMClient mockado**

`tests/test_sentiment.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from src.sentiment import classify_titles


@pytest.mark.asyncio
async def test_classify_titles_returns_labels():
    fake_resp = '["POS","NEG","NEU"]'
    with patch("src.sentiment.LLMClient") as MockLLM:
        instance = MockLLM.return_value
        instance.complete = AsyncMock(return_value=fake_resp)
        out = await classify_titles(["lucro recorde", "queda forte", "estável"])
        assert out == ["POS", "NEG", "NEU"]


@pytest.mark.asyncio
async def test_classify_titles_handles_empty():
    out = await classify_titles([])
    assert out == []
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_sentiment.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar `src/sentiment.py`**

```python
from __future__ import annotations
import hashlib, json
from datetime import timedelta
from src.cache import get_or_fetch
from src.llm.client import LLMClient
from src.llm.routing import ROUTING_TABLE

_PROMPT = (
    "Classifique cada manchete como POS (positivo para a ação), "
    "NEG (negativo) ou NEU (neutro). Responda APENAS um array JSON "
    'de mesma ordem e tamanho. Exemplo: ["POS","NEU","NEG"].\n\nManchetes:\n'
)


async def classify_titles(titles: list[str]) -> list[str]:
    if not titles:
        return []

    keys = [f"sentiment:{hashlib.md5(t.encode()).hexdigest()}" for t in titles]
    cached: list[str | None] = []
    for key in keys:
        try:
            v = await get_or_fetch(key, timedelta(days=3650), lambda: None)
        except Exception:
            v = None
        cached.append(v if v in ("POS", "NEG", "NEU") else None)

    pending_idx = [i for i, v in enumerate(cached) if v is None]
    if pending_idx:
        pending_titles = [titles[i] for i in pending_idx]
        prompt = _PROMPT + "\n".join(f"{i+1}. {t}" for i, t in enumerate(pending_titles))
        client = LLMClient()
        model = ROUTING_TABLE.get("sentiment", {}).get("primary", "z-ai/glm-4.5-air:free")
        raw = await client.complete(model=model, prompt=prompt, max_tokens=200)
        try:
            labels = json.loads(raw.strip().split("```")[-1].strip("json\n "))
        except Exception:
            labels = ["NEU"] * len(pending_titles)
        for i, lab in zip(pending_idx, labels):
            if lab not in ("POS", "NEG", "NEU"):
                lab = "NEU"
            cached[i] = lab
            await get_or_fetch(
                f"sentiment:{hashlib.md5(titles[i].encode()).hexdigest()}",
                timedelta(days=3650),
                lambda lab=lab: lab,
            )
    return [v or "NEU" for v in cached]
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_sentiment.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sentiment.py tests/test_sentiment.py
git commit -m "feat(sentiment): add batch news headline classifier"
```

---

## Fase B — Backend: serviço por aba + endpoints

### Task B1: stock_service skeleton + overview + endpoint

**Files:**
- Create: `src/stock_service.py`
- Modify: `src/api.py`
- Test: `tests/test_stock_overview.py`

- [ ] **Step 1: Escrever teste end-to-end com yfinance mockado**

`tests/test_stock_overview.py`:

```python
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pandas as pd
from src.api import app


def make_fake_ticker():
    t = MagicMock()
    fi = MagicMock()
    fi.last_price = 45.13; fi.previous_close = 44.48
    fi.last_volume = 36_000_000; fi.market_cap = 6.17e11
    fi.currency = "BRL"
    t.fast_info = fi
    t.info = {
        "longBusinessSummary": "Petroleo Brasileiro...",
        "trailingPE": 6.04, "priceToBook": 1.4,
        "dividendYield": 8.66, "shortName": "PETROBRAS PN",
        "longName": "Petroleo Brasileiro S.A.",
        "fullTimeEmployees": 45000,
        "city": "Rio", "country": "Brazil",
        "website": "https://petrobras.com.br",
        "sector": "Energy", "industry": "Oil & Gas",
        "beta": 1.2, "trailingEps": 7.18,
    }
    n = 260
    idx = pd.date_range("2025-05-01", periods=n, freq="D")
    t.history = MagicMock(return_value=pd.DataFrame({
        "Open":   [40+i*0.02 for i in range(n)],
        "High":   [42+i*0.02 for i in range(n)],
        "Low":    [39+i*0.02 for i in range(n)],
        "Close":  [41+i*0.02 for i in range(n)],
        "Volume":[1e6]*n,
    }, index=idx))
    t.major_holders = pd.DataFrame({"Value": ["50.39%", "49.61%"]},
                                    index=["% of Shares Held by Insiders", "% of Shares Held by Institutions"])
    t.news = []
    return t


@patch("src.stock_service.yf.Ticker")
def test_overview_shape(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    mock_ticker.return_value = make_fake_ticker()
    client = TestClient(app)
    r = client.get("/stock/PETR4/overview")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ticker"].endswith("PETR4.SA")
    assert "quote" in data and data["quote"]["price"] == 45.13
    assert "profile" in data
    assert "kpis" in data
    assert "seasonals_mini" in data and len(data["seasonals_mini"]) <= 12
    assert "technicals_summary" in data
    assert "forecast_summary" in data
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_stock_overview.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar `src/stock_service.py` parcial (apenas overview)**

```python
from __future__ import annotations
import asyncio
from datetime import timedelta
from typing import Any
import yfinance as yf
import pandas as pd
from src.cache import get_or_fetch
from src.technicals import compute_signals
from src.seasonals import compute_seasonals


def _normalize_ticker(t: str) -> str:
    t = t.upper().strip()
    return t if t.endswith(".SA") else f"{t}.SA"


async def _fetch_info(ticker: str) -> dict:
    def f():
        try: return yf.Ticker(ticker).info or {}
        except Exception: return {}
    return await get_or_fetch(f"yf_info:{ticker}", timedelta(hours=6), f)


async def _fetch_fast_info(ticker: str) -> dict:
    def f():
        try:
            fi = yf.Ticker(ticker).fast_info
            return {
                "last_price": float(fi.last_price or 0),
                "previous_close": float(fi.previous_close or 0),
                "last_volume": int(fi.last_volume or 0),
                "market_cap": float(fi.market_cap or 0),
                "currency": fi.currency or "BRL",
            }
        except Exception:
            return {}
    return await get_or_fetch(f"yf_quote:{ticker}", timedelta(seconds=30), f)


async def _fetch_history(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    def f():
        try:
            df = yf.Ticker(ticker).history(period=period, interval=interval)
            return df.reset_index().to_dict(orient="records")
        except Exception:
            return []
    rows = await get_or_fetch(
        f"yf_history:{ticker}:{period}:{interval}", timedelta(hours=1), f
    )
    if not rows: return pd.DataFrame()
    df = pd.DataFrame(rows)
    if "Date" in df.columns:
        df.index = pd.to_datetime(df["Date"]); df = df.drop(columns=["Date"])
    return df


async def get_overview(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        fi, info, hist1y, hist5y = await asyncio.gather(
            _fetch_fast_info(ticker),
            _fetch_info(ticker),
            _fetch_history(ticker, "1y", "1d"),
            _fetch_history(ticker, "5y", "1mo"),
        )
        price = fi.get("last_price", 0); prev = fi.get("previous_close", 0)
        change = price - prev
        change_pct = (change / prev * 100) if prev else 0

        signals = compute_signals(hist1y) if not hist1y.empty and len(hist1y) >= 20 else None
        seasonal = compute_seasonals(hist5y) if not hist5y.empty else {"monthly_avg_5y": [], "years": []}

        return {
            "ticker": ticker,
            "quote": {
                "price": round(price, 2), "prev_close": round(prev, 2),
                "change": round(change, 2), "change_pct": round(change_pct, 2),
                "volume": fi.get("last_volume"), "mkt_cap": fi.get("market_cap"),
                "currency": fi.get("currency", "BRL"),
            },
            "profile": {
                "long_name": info.get("longName") or info.get("shortName"),
                "summary": info.get("longBusinessSummary"),
                "ceo": (info.get("companyOfficers", [{}])[0].get("name")
                        if info.get("companyOfficers") else None),
                "founded": None,
                "employees": info.get("fullTimeEmployees"),
                "website": info.get("website"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
            },
            "kpis": {
                "mkt_cap": fi.get("market_cap"),
                "div_yield": info.get("dividendYield"),
                "pl_12m": info.get("trailingPE"),
                "eps_12m": info.get("trailingEps"),
                "beta": info.get("beta"),
                "volatility": None,
                "last_quarter_profit": info.get("netIncomeToCommon"),
            },
            "last_earnings": None,
            "next_earnings": None,
            "shareholders": {
                "closely_held_pct": info.get("heldPercentInsiders"),
                "free_float_pct": (1 - info.get("heldPercentInsiders", 0)) if info.get("heldPercentInsiders") else None,
                "total_shares": info.get("sharesOutstanding"),
            },
            "seasonals_mini": seasonal.get("monthly_avg_5y", [])[:12],
            "news_preview": [],
            "technicals_summary": signals["summary"] if signals else {
                "signal": "NEUTRAL", "today": "NEUTRAL", "week": "NEUTRAL", "month": "NEUTRAL", "counts": {}
            },
            "forecast_summary": {
                "target_mean": None, "target_high": None, "target_low": None,
                "target_median": None, "current": price, "recommendations": {},
            },
        }
    return await get_or_fetch(f"overview:{ticker}", timedelta(minutes=10), build)
```

- [ ] **Step 4: Adicionar endpoint em `src/api.py`**

Antes do `/chart/{ticker}`:

```python
from src.stock_service import get_overview as _svc_overview

@app.get("/stock/{ticker}/overview")
async def stock_overview(ticker: str):
    return await _svc_overview(ticker)
```

E garantir que `init_cache_db` é chamado no `lifespan`:

```python
from src.cache import init_cache_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_cache_db()
    yield
```

- [ ] **Step 5: Rodar e ver passar**

```bash
poetry run pytest tests/test_stock_overview.py -v
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stock_service.py src/api.py tests/test_stock_overview.py
git commit -m "feat(api): add /stock/:ticker/overview endpoint"
```

---

### Task B2: get_financials + endpoint

**Files:**
- Modify: `src/stock_service.py`
- Modify: `src/api.py`
- Test: `tests/test_stock_financials.py`

- [ ] **Step 1: Escrever teste**

`tests/test_stock_financials.py`:

```python
import pytest
from unittest.mock import MagicMock, patch
import pandas as pd
from fastapi.testclient import TestClient
from src.api import app


def make_ticker():
    t = MagicMock()
    fi = MagicMock(); fi.market_cap = 1.18e11
    t.fast_info = fi
    t.info = {
        "totalDebt": 1.07e12, "totalCash": 1.4e11,
        "minorityInterest": 4.4e9, "enterpriseValue": 1.05e12,
        "trailingPE": 8.65, "priceToSalesTrailing12Months": 0.81,
        "priceToBook": 1.2, "enterpriseToEbitda": 6.5,
        "totalRevenue": 1.46e11, "netIncomeToCommon": 1.37e10,
        "returnOnEquity": 0.198, "returnOnAssets": 0.0142,
        "profitMargins": 0.094, "operatingMargins": 0.221,
        "dividendRate": 3.91, "dividendYield": 4.16,
    }
    rev = pd.DataFrame(
        {pd.Timestamp(f"{y}-12-31"): {"Total Revenue": v}
         for y, v in [(2021,9.2e10),(2022,1.1e11),(2023,1.25e11),(2024,1.4e11),(2025,1.46e11)]}
    ).T.T
    t.financials = rev
    t.balance_sheet = pd.DataFrame()
    t.dividends = pd.Series(dtype=float)
    t.earnings_history = pd.DataFrame()
    t.calendar = {}
    return t


@patch("src.stock_service.yf.Ticker")
def test_financials_shape(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    mock_ticker.return_value = make_ticker()
    client = TestClient(app)
    r = client.get("/stock/PETR4/financials")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "facts" in data and "capital_structure" in data
    assert "valuation" in data and "growth" in data
    assert "profitability" in data and "dividends_history" in data
    assert "financial_health" in data and "estimates" in data
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_stock_financials.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar `get_financials` em `stock_service.py`**

```python
async def _fetch_financials(ticker: str) -> dict:
    def f():
        try:
            t = yf.Ticker(ticker)
            fin = t.financials
            bs = t.balance_sheet
            div = t.dividends
            return {
                "financials_cols": [str(c) for c in fin.columns] if not fin.empty else [],
                "revenue_by_year": {str(c.year): float(fin.loc["Total Revenue", c])
                                    for c in fin.columns if "Total Revenue" in fin.index} if not fin.empty else {},
                "dividends_by_year": {str(d.year): float(v) for d, v in div.items()} if not div.empty else {},
            }
        except Exception:
            return {}
    return await get_or_fetch(f"yf_financials:{ticker}", timedelta(hours=12), f)


async def get_financials(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        fi, info, fin = await asyncio.gather(
            _fetch_fast_info(ticker),
            _fetch_info(ticker),
            _fetch_financials(ticker),
        )
        rev = fin.get("revenue_by_year", {})
        years = sorted(rev.keys())
        growth = [{"year": int(y), "revenue": rev[y]} for y in years]

        div_by_year: dict[str, float] = {}
        for date_str, amount in fin.get("dividends_by_year", {}).items():
            year = date_str[:4] if isinstance(date_str, str) else str(date_str)
            div_by_year[year] = div_by_year.get(year, 0) + amount
        dividends_history = [
            {"year": int(y), "dps": round(v, 2), "dy_pct": None}
            for y, v in sorted(div_by_year.items())
        ]

        return {
            "facts": {
                "mkt_cap": fi.get("market_cap"),
                "div_yield": info.get("dividendYield"),
                "pl_12m": info.get("trailingPE"),
                "eps_12m": info.get("trailingEps"),
                "beta": info.get("beta"),
                "volatility": None,
                "last_quarter_profit": info.get("netIncomeToCommon"),
            },
            "capital_structure": {
                "mkt_cap": fi.get("market_cap"),
                "debt": info.get("totalDebt"),
                "cash": info.get("totalCash"),
                "minority_interest": info.get("minorityInterest"),
                "enterprise_value": info.get("enterpriseValue"),
            },
            "valuation": {
                "pl": info.get("trailingPE"),
                "ps": info.get("priceToSalesTrailing12Months"),
                "pb": info.get("priceToBook"),
                "ev_ebitda": info.get("enterpriseToEbitda"),
                "revenue": info.get("totalRevenue"),
                "net_income": info.get("netIncomeToCommon"),
            },
            "growth": growth,
            "profitability": {
                "roe": info.get("returnOnEquity"),
                "roa": info.get("returnOnAssets"),
                "net_margin": info.get("profitMargins"),
                "ebit_margin": info.get("operatingMargins"),
            },
            "dividends_history": dividends_history,
            "next_dividend": None,
            "financial_health": [],  # bancos teriam loans/deposits — yfinance não expõe consistentemente
            "estimates": [],
        }
    return await get_or_fetch(f"financials:{ticker}", timedelta(hours=1), build)
```

E em `src/api.py`:

```python
from src.stock_service import get_financials as _svc_financials

@app.get("/stock/{ticker}/financials")
async def stock_financials(ticker: str):
    return await _svc_financials(ticker)
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_stock_financials.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stock_service.py src/api.py tests/test_stock_financials.py
git commit -m "feat(api): add /stock/:ticker/financials endpoint"
```

---

### Task B3: get_news + endpoint (com sentimento batch)

**Files:**
- Modify: `src/stock_service.py`
- Modify: `src/api.py`
- Test: `tests/test_stock_news.py`

- [ ] **Step 1: Escrever teste**

`tests/test_stock_news.py`:

```python
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from src.api import app


@patch("src.stock_service.classify_titles", new_callable=AsyncMock)
@patch("src.stock_service.fetch_news")
@patch("src.stock_service.yf.Ticker")
def test_news_endpoint(mock_ticker, mock_gnews, mock_sent, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    mock_ticker.return_value = MagicMock(news=[])
    mock_gnews.return_value = MagicMock(
        ticker="PETR4.SA",
        headlines=["BB sobe forte", "Receita cai", "Resultado estável"],
    )
    mock_sent.return_value = ["POS", "NEG", "NEU"]
    client = TestClient(app)
    r = client.get("/stock/PETR4/news")
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert len(items) == 3
    assert items[0]["sentiment"] == "POS"
    assert items[1]["sentiment"] == "NEG"
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_stock_news.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar**

Em `stock_service.py`, no topo do arquivo:

```python
from src.data.news import fetch_news
from src.sentiment import classify_titles
```

E adicionar a função:

```python
async def get_news(ticker_raw: str, limit: int = 20) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        info = await _fetch_info(ticker)
        company = info.get("shortName") or info.get("longName") or ticker
        news_data = await fetch_news(ticker, company)
        gnews_titles = news_data.headlines[:limit]

        yf_news = []
        try:
            for item in (yf.Ticker(ticker).news or [])[:limit]:
                content = item.get("content", {}) or item
                title = content.get("title")
                if title:
                    yf_news.append({
                        "title": title,
                        "source": content.get("provider", {}).get("displayName", "yfinance"),
                        "url": content.get("canonicalUrl", {}).get("url"),
                        "published_at": content.get("pubDate"),
                        "summary": content.get("summary"),
                    })
        except Exception:
            pass

        seen, items = set(), []
        for t in gnews_titles:
            if t in seen: continue
            seen.add(t)
            items.append({"title": t, "source": "GNews", "url": None,
                          "published_at": None, "summary": None})
        for it in yf_news:
            if it["title"] in seen: continue
            seen.add(it["title"]); items.append(it)
        items = items[:limit]

        labels = await classify_titles([it["title"] for it in items])
        for it, lab in zip(items, labels):
            it["sentiment"] = lab
            it["sentiment_score"] = {"POS": 60, "NEG": -60, "NEU": 0}[lab]

        return {"items": items, "next_cursor": None}
    return await get_or_fetch(f"news:{ticker}", timedelta(minutes=5), build)
```

Em `src/api.py`:

```python
from src.stock_service import get_news as _svc_news

@app.get("/stock/{ticker}/news")
async def stock_news(ticker: str, limit: int = 20):
    return await _svc_news(ticker, limit=limit)
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_stock_news.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stock_service.py src/api.py tests/test_stock_news.py
git commit -m "feat(api): add /stock/:ticker/news endpoint with sentiment"
```

---

### Task B4: get_technicals + endpoint

**Files:**
- Modify: `src/stock_service.py`
- Modify: `src/api.py`
- Test: `tests/test_stock_technicals.py`

- [ ] **Step 1: Escrever teste**

`tests/test_stock_technicals.py`:

```python
from unittest.mock import patch, MagicMock
import pandas as pd, numpy as np
from fastapi.testclient import TestClient
from src.api import app


@patch("src.stock_service.yf.Ticker")
def test_technicals_endpoint(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    np.random.seed(1); n = 260
    idx = pd.date_range("2025-01-01", periods=n, freq="D")
    df = pd.DataFrame({
        "Open": np.random.uniform(20, 25, n), "High": np.random.uniform(20, 26, n),
        "Low": np.random.uniform(18, 21, n),  "Close": np.random.uniform(19, 25, n),
        "Volume": np.random.randint(1e6, 1e7, n),
    }, index=idx)
    t = MagicMock(); t.history.return_value = df
    mock_ticker.return_value = t
    client = TestClient(app)
    r = client.get("/stock/PETR4/technicals")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["summary"]["signal"] in ("STRONG_BUY","BUY","NEUTRAL","SELL","STRONG_SELL")
    assert len(data["oscillators"]) >= 5
    assert len(data["moving_averages"]) >= 5
    assert len(data["pivots"]) == 5
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_stock_technicals.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar**

Em `stock_service.py`:

```python
async def get_technicals(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        hist = await _fetch_history(ticker, "1y", "1d")
        if hist.empty or len(hist) < 20:
            return {
                "summary": {"signal": "NEUTRAL", "today": "NEUTRAL", "week": "NEUTRAL", "month": "NEUTRAL", "counts": {}},
                "oscillators": [], "moving_averages": [], "pivots": [],
            }
        return compute_signals(hist)
    return await get_or_fetch(f"technicals:{ticker}", timedelta(hours=1), build)
```

Em `src/api.py`:

```python
from src.stock_service import get_technicals as _svc_technicals

@app.get("/stock/{ticker}/technicals")
async def stock_technicals(ticker: str):
    return await _svc_technicals(ticker)
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_stock_technicals.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stock_service.py src/api.py tests/test_stock_technicals.py
git commit -m "feat(api): add /stock/:ticker/technicals endpoint"
```

---

### Task B5: get_forecast + endpoint

**Files:**
- Modify: `src/stock_service.py`
- Modify: `src/api.py`
- Test: `tests/test_stock_forecast.py`

- [ ] **Step 1: Escrever teste**

`tests/test_stock_forecast.py`:

```python
from unittest.mock import patch, MagicMock
import pandas as pd
from fastapi.testclient import TestClient
from src.api import app


@patch("src.stock_service.yf.Ticker")
def test_forecast_endpoint(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    t = MagicMock()
    t.fast_info = MagicMock(last_price=45.13, previous_close=44.5,
                            last_volume=1e6, market_cap=6e11, currency="BRL")
    t.analyst_price_targets = {"current": 45.07, "high": 65.0, "low": 43.0,
                                "mean": 53.225, "median": 49.85}
    t.recommendations = pd.DataFrame([
        {"period": "0m", "strongBuy": 4, "buy": 6, "hold": 4, "sell": 0, "strongSell": 0}
    ])
    t.earnings_history = pd.DataFrame()
    mock_ticker.return_value = t
    client = TestClient(app)
    r = client.get("/stock/PETR4/forecast")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["price_target"]["target_mean"] == 53.225
    assert data["recommendations"]["strong_buy"] == 4
    assert data["recommendations"]["buy"] == 6
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_stock_forecast.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar**

```python
async def _fetch_forecast_raw(ticker: str) -> dict:
    def f():
        try:
            t = yf.Ticker(ticker)
            tgt = t.analyst_price_targets or {}
            try: rec = t.recommendations
            except Exception: rec = None
            rec_dict = {"strong_buy": 0, "buy": 0, "hold": 0, "sell": 0, "strong_sell": 0}
            if rec is not None and not rec.empty:
                latest = rec.iloc[0]
                rec_dict = {
                    "strong_buy": int(latest.get("strongBuy", 0)),
                    "buy": int(latest.get("buy", 0)),
                    "hold": int(latest.get("hold", 0)),
                    "sell": int(latest.get("sell", 0)),
                    "strong_sell": int(latest.get("strongSell", 0)),
                }
            return {"target": tgt, "recommendations": rec_dict}
        except Exception:
            return {"target": {}, "recommendations": {}}
    return await get_or_fetch(f"yf_forecast:{ticker}", timedelta(hours=12), f)


async def get_forecast(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        fi, fc = await asyncio.gather(
            _fetch_fast_info(ticker),
            _fetch_forecast_raw(ticker),
        )
        tgt = fc.get("target", {})
        return {
            "price_target": {
                "current": fi.get("last_price") or tgt.get("current"),
                "target_mean": tgt.get("mean"),
                "target_high": tgt.get("high"),
                "target_low": tgt.get("low"),
                "target_median": tgt.get("median"),
                "recommendations": fc.get("recommendations", {}),
            },
            "recommendations": fc.get("recommendations", {}),
            "eps_history": [],
            "revenue_history": [],
            "next_eps_estimate": None,
            "next_revenue_estimate": None,
        }
    return await get_or_fetch(f"forecast:{ticker}", timedelta(hours=1), build)
```

Em `src/api.py`:

```python
from src.stock_service import get_forecast as _svc_forecast

@app.get("/stock/{ticker}/forecast")
async def stock_forecast(ticker: str):
    return await _svc_forecast(ticker)
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_stock_forecast.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stock_service.py src/api.py tests/test_stock_forecast.py
git commit -m "feat(api): add /stock/:ticker/forecast endpoint"
```

---

### Task B6: get_seasonals + endpoint

**Files:**
- Modify: `src/stock_service.py`
- Modify: `src/api.py`
- Test: `tests/test_stock_seasonals.py`

- [ ] **Step 1: Escrever teste**

`tests/test_stock_seasonals.py`:

```python
from unittest.mock import patch, MagicMock
import pandas as pd, numpy as np
from fastapi.testclient import TestClient
from src.api import app


@patch("src.stock_service.yf.Ticker")
def test_seasonals_endpoint(mock_ticker, tmp_path, monkeypatch):
    monkeypatch.setattr("src.cache._DB_PATH", str(tmp_path / "c.db"))
    idx = pd.date_range("2021-01-01", "2025-12-31", freq="ME")
    np.random.seed(0)
    df = pd.DataFrame({"Close": np.random.uniform(20, 30, len(idx))}, index=idx)
    t = MagicMock(); t.history.return_value = df
    mock_ticker.return_value = t
    client = TestClient(app)
    r = client.get("/stock/PETR4/seasonals")
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["monthly_avg_5y"]) == 12
    assert len(data["years"]) >= 4
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
poetry run pytest tests/test_stock_seasonals.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implementar**

```python
async def get_seasonals(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        hist = await _fetch_history(ticker, "5y", "1mo")
        if hist.empty:
            return {"monthly_avg_5y": [], "years": []}
        return compute_seasonals(hist)
    return await get_or_fetch(f"seasonals:{ticker}", timedelta(hours=24), build)
```

Em `src/api.py`:

```python
from src.stock_service import get_seasonals as _svc_seasonals

@app.get("/stock/{ticker}/seasonals")
async def stock_seasonals(ticker: str):
    return await _svc_seasonals(ticker)
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_stock_seasonals.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stock_service.py src/api.py tests/test_stock_seasonals.py
git commit -m "feat(api): add /stock/:ticker/seasonals endpoint"
```

---

### Task B7: filtro `?ticker=` em `/analyses`

**Files:**
- Modify: `src/db.py`
- Modify: `src/api.py`
- Test: `tests/test_analyses_filter.py`

- [ ] **Step 1: Escrever teste**

`tests/test_analyses_filter.py`:

```python
from fastapi.testclient import TestClient
from src.api import app


def test_analyses_filter_by_ticker(tmp_path, monkeypatch):
    monkeypatch.setattr("src.db.DB_PATH", str(tmp_path / "analyses.db"))
    client = TestClient(app)
    r = client.get("/analyses?ticker=PETR4")
    assert r.status_code == 200
```

- [ ] **Step 2: Modificar `src/db.py`** — adicionar parâmetro à `list_analyses`

Encontrar a função `list_analyses` em `src/db.py` e atualizar a assinatura/SQL:

```python
async def list_analyses(ticker: str | None = None) -> list[dict]:
    sql = "SELECT job_id, ticker, recommendation, confidence, created_at FROM analyses"
    params: tuple = ()
    if ticker:
        sql += " WHERE UPPER(ticker) LIKE ?"
        params = (f"%{ticker.upper()}%",)
    sql += " ORDER BY created_at DESC"
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(sql, params) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]
```

- [ ] **Step 3: Modificar `/analyses` em `src/api.py`**

```python
@app.get("/analyses", response_model=list[AnalysisRow])
async def get_analyses(ticker: str | None = None):
    return await list_analyses(ticker=ticker)
```

- [ ] **Step 4: Rodar e ver passar**

```bash
poetry run pytest tests/test_analyses_filter.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db.py src/api.py tests/test_analyses_filter.py
git commit -m "feat(api): add ticker filter to /analyses"
```

---

## Fase C — Frontend: lib, infra, estilos

### Task C1: Proxy `/stock` no Vite + classes glass no CSS

**Files:**
- Modify: `web/vite.config.ts`
- Modify: `web/src/index.css`

- [ ] **Step 1: Adicionar proxy**

Em `web/vite.config.ts`, na seção `proxy`, depois de `/quote`:

```ts
      '/stock':   'http://localhost:8000',
```

- [ ] **Step 2: Adicionar classes glass em `web/src/index.css`**

Acrescentar no final do arquivo:

```css
.glass {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-radius: 16px;
}
.glass-strong {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border-radius: 16px;
}
.glass-accent {
  background: linear-gradient(135deg, rgba(255,161,108,0.06), rgba(255,161,108,0.02));
  border: 1px solid rgba(255,161,108,0.15);
  backdrop-filter: blur(20px);
  border-radius: 16px;
}
@keyframes shimmer {
  0%   { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
.shimmer {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.03) 0%,
    rgba(255,161,108,0.06) 50%,
    rgba(255,255,255,0.03) 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s linear infinite;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/vite.config.ts web/src/index.css
git commit -m "feat(web): add /stock proxy and glass/shimmer CSS utilities"
```

---

### Task C2: `web/src/lib/stockApi.ts` com tipos e fetchers

**Files:**
- Create: `web/src/lib/stockApi.ts`
- Test: `web/src/test/stockApi.test.ts`

- [ ] **Step 1: Escrever teste**

`web/src/test/stockApi.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { fetchOverview, fetchFinancials, fetchStockNews, fetchTechnicals, fetchForecastData, fetchSeasonals } from '../lib/stockApi'

describe('stockApi', () => {
  it('fetchOverview chama /stock/X/overview', async () => {
    const spy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ticker: 'PETR4.SA' }), { status: 200 })
    )
    await fetchOverview('PETR4')
    expect(spy).toHaveBeenCalledWith('/stock/PETR4/overview')
    spy.mockRestore()
  })

  it('fetchStockNews aceita limit', async () => {
    const spy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 })
    )
    await fetchStockNews('PETR4', 10)
    expect(spy).toHaveBeenCalledWith('/stock/PETR4/news?limit=10')
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd web && npm run test -- --run src/test/stockApi.test.ts 2>&1 | tail -10
```
Expected: FAIL.

- [ ] **Step 3: Implementar `web/src/lib/stockApi.ts`**

```ts
export interface QuoteData {
  price: number; prev_close: number; change: number; change_pct: number
  volume: number | null; mkt_cap: number | null; currency: string
}

export interface ProfileData {
  long_name: string | null; summary: string | null
  ceo: string | null; founded: number | null
  employees: number | null; website: string | null
  sector: string | null; industry: string | null
}

export interface KPIData {
  mkt_cap: number | null; div_yield: number | null
  pl_12m: number | null; eps_12m: number | null
  beta: number | null; volatility: number | null
  last_quarter_profit: number | null
}

export interface ShareholdersData {
  closely_held_pct: number | null
  free_float_pct: number | null
  total_shares: number | null
}

export interface SeasonalMonth { month: number; avg_return_pct: number }
export interface TechnicalsSummary {
  signal: string; today: string; week: string; month: string
  counts: Record<string, number>
}
export interface ForecastSummary {
  target_mean: number | null; target_high: number | null
  target_low: number | null; target_median: number | null
  current: number | null; recommendations: Record<string, number>
}
export interface NewsItem {
  title: string; source: string; url: string | null
  published_at: string | null; summary: string | null
  sentiment: 'POS' | 'NEG' | 'NEU' | null
  sentiment_score: number | null
}
export interface OverviewResponse {
  ticker: string
  quote: QuoteData
  profile: ProfileData
  kpis: KPIData
  shareholders: ShareholdersData
  seasonals_mini: SeasonalMonth[]
  news_preview: NewsItem[]
  technicals_summary: TechnicalsSummary
  forecast_summary: ForecastSummary
}

export interface CapitalStructure {
  mkt_cap: number | null; debt: number | null
  cash: number | null; minority_interest: number | null
  enterprise_value: number | null
}
export interface ValuationData {
  pl: number | null; ps: number | null; pb: number | null
  ev_ebitda: number | null; revenue: number | null; net_income: number | null
}
export interface GrowthYear { year: number; revenue: number | null }
export interface ProfitabilityData {
  roe: number | null; roa: number | null
  net_margin: number | null; ebit_margin: number | null
}
export interface DividendYear { year: number; dps: number | null; dy_pct: number | null }
export interface HealthYear {
  year: number; loans: number | null
  deposits: number | null; provisions: number | null
}
export interface EarningsRow {
  date: string | null; period: string | null
  eps_reported: number | null; eps_estimate: number | null; eps_surprise_pct: number | null
  revenue_reported: number | null; revenue_estimate: number | null; revenue_surprise_pct: number | null
}
export interface FinancialsResponse {
  facts: KPIData
  capital_structure: CapitalStructure
  valuation: ValuationData
  growth: GrowthYear[]
  profitability: ProfitabilityData
  dividends_history: DividendYear[]
  next_dividend: { amount: number | null; ex_date: string | null } | null
  financial_health: HealthYear[]
  estimates: EarningsRow[]
}

export interface IndicatorRow { name: string; value: number | null; signal: string }
export interface PivotRow {
  method: string; p: number | null
  r1: number | null; r2: number | null; r3: number | null
  s1: number | null; s2: number | null; s3: number | null
}
export interface TechnicalsResponse {
  summary: TechnicalsSummary
  oscillators: IndicatorRow[]
  moving_averages: IndicatorRow[]
  pivots: PivotRow[]
}

export interface ForecastResponse {
  price_target: ForecastSummary
  recommendations: Record<string, number>
  eps_history: EarningsRow[]
  revenue_history: EarningsRow[]
  next_eps_estimate: number | null
  next_revenue_estimate: number | null
}

export interface SeasonalYear {
  year: number
  data: { month: number; return_pct: number }[]
}
export interface SeasonalsResponse {
  monthly_avg_5y: SeasonalMonth[]
  years: SeasonalYear[]
}

export interface NewsResponse { items: NewsItem[]; next_cursor: string | null }

function tickerBase(t: string): string {
  return t.toUpperCase().replace(/\.SA$/i, '')
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  return r.json() as Promise<T>
}

export const fetchOverview     = (t: string) => getJson<OverviewResponse>    (`/stock/${tickerBase(t)}/overview`)
export const fetchFinancials   = (t: string) => getJson<FinancialsResponse>  (`/stock/${tickerBase(t)}/financials`)
export const fetchStockNews    = (t: string, limit = 20) => getJson<NewsResponse>(`/stock/${tickerBase(t)}/news?limit=${limit}`)
export const fetchTechnicals   = (t: string) => getJson<TechnicalsResponse>  (`/stock/${tickerBase(t)}/technicals`)
export const fetchForecastData = (t: string) => getJson<ForecastResponse>    (`/stock/${tickerBase(t)}/forecast`)
export const fetchSeasonals    = (t: string) => getJson<SeasonalsResponse>   (`/stock/${tickerBase(t)}/seasonals`)
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd web && npm run test -- --run src/test/stockApi.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/stockApi.ts web/src/test/stockApi.test.ts
git commit -m "feat(web): add stockApi fetchers and TypeScript types"
```

---

### Task C3: Hook `useStockData` com cache de sessão

**Files:**
- Create: `web/src/lib/useStockData.ts`

- [ ] **Step 1: Implementar**

`web/src/lib/useStockData.ts`:

```ts
import { useEffect, useRef, useState } from 'react'

type TabName = 'overview' | 'financials' | 'news' | 'technicals' | 'forecast' | 'seasonals'

const sessionCache: Map<string, unknown> = new Map()

export function useStockData<T>(
  ticker: string,
  tab: TabName,
  fetcher: (t: string) => Promise<T>,
  enabled: boolean = true,
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const base = ticker.toUpperCase().replace(/\.SA$/i, '')
    const key = `${base}:${tab}`
    const cached = sessionCache.get(key) as T | undefined
    if (cached) { setData(cached); return }
    const id = ++reqId.current
    setLoading(true); setError(null)
    fetcher(base)
      .then(d => {
        if (id !== reqId.current) return
        sessionCache.set(key, d)
        setData(d)
      })
      .catch(e => { if (id === reqId.current) setError(e.message) })
      .finally(() => { if (id === reqId.current) setLoading(false) })
  }, [ticker, tab, enabled])

  return { data, loading, error }
}

export function invalidateStockCache(ticker: string, tab?: TabName) {
  const base = ticker.toUpperCase().replace(/\.SA$/i, '')
  if (tab) sessionCache.delete(`${base}:${tab}`)
  else for (const k of Array.from(sessionCache.keys())) {
    if (k.startsWith(`${base}:`)) sessionCache.delete(k)
  }
}
```

- [ ] **Step 2: Verificar compilação**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/useStockData.ts
git commit -m "feat(web): add useStockData hook with session cache"
```

---

## Fase D — Widgets básicos (não-gráficos)

### Task D1: `SkeletonCard`

**Files:**
- Create: `web/src/components/stock/widgets/SkeletonCard.tsx`

- [ ] **Step 1: Implementar**

```tsx
interface Props { height?: number | string; className?: string }

export function SkeletonCard({ height = 80, className = '' }: Props) {
  return (
    <div className={`shimmer ${className}`}
      style={{ height, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}
      aria-busy="true"
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/SkeletonCard.tsx
git commit -m "feat(stock): add SkeletonCard widget"
```

---

### Task D2: `KPICard` + `KPIGrid`

**Files:**
- Create: `web/src/components/stock/widgets/KPICard.tsx`
- Create: `web/src/components/stock/widgets/KPIGrid.tsx`
- Test: `web/src/test/KPICard.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KPICard } from '../components/stock/widgets/KPICard'

describe('KPICard', () => {
  it('renderiza label, valor e sub', () => {
    render(<KPICard label="P/L 12M" value="8,65×" sub="setor 9,1×" />)
    expect(screen.getByText('P/L 12M')).toBeInTheDocument()
    expect(screen.getByText('8,65×')).toBeInTheDocument()
    expect(screen.getByText('setor 9,1×')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implementar `KPICard.tsx`**

```tsx
interface KPICardProps {
  label: string
  value: string
  sub?: string
}

export function KPICard({ label, value, sub }: KPICardProps) {
  return (
    <div className="glass" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#868f97' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: '#e6e6e6', letterSpacing: '-0.01em' }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: '#868f97', fontFamily: 'monospace' }}>{sub}</span>}
    </div>
  )
}
```

- [ ] **Step 3: Implementar `KPIGrid.tsx`**

```tsx
import { ReactNode } from 'react'

interface KPIGridProps { children: ReactNode; columns?: number }

export function KPIGrid({ children, columns = 6 }: KPIGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10 }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd web && npm run test -- --run src/test/KPICard.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/stock/widgets/KPICard.tsx \
        web/src/components/stock/widgets/KPIGrid.tsx \
        web/src/test/KPICard.test.tsx
git commit -m "feat(stock): add KPICard and KPIGrid widgets"
```

---

### Task D3: `AboutCard`

**Files:**
- Create: `web/src/components/stock/widgets/AboutCard.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useState } from 'react'

interface AboutCardProps {
  summary: string | null
  ceo: string | null
  founded: number | null
  employees: number | null
  website: string | null
}

export function AboutCard({ summary, ceo, founded, employees, website }: AboutCardProps) {
  const [open, setOpen] = useState(false)
  const text = summary || 'Sem descrição disponível.'
  const truncated = text.length > 320 && !open ? text.slice(0, 320) + '…' : text
  const fmtNum = (n: number | null) => n ? n.toLocaleString('pt-BR') : '—'

  return (
    <div className="glass" style={{ padding: 22 }}>
      <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 12, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/> Sobre a empresa
      </h3>
      <p style={{ fontSize: 12, color: '#cccccc', lineHeight: 1.7 }}>{truncated}</p>
      {text.length > 320 && (
        <button onClick={() => setOpen(o => !o)}
          style={{ marginTop: 10, background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 10, color: '#479ffa' }}>
          {open ? '▴ Mostrar menos' : 'Mostrar mais ▾'}
        </button>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14,
        paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Meta label="Fundada em" value={founded ? String(founded) : '—'} />
        <Meta label="CEO" value={ceo || '—'} />
        <Meta label="Colaboradores" value={fmtNum(employees)} />
        <Meta label="Site" value={website || '—'} href={website || undefined} />
      </div>
    </div>
  )
}

function Meta({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase',
        color: '#868f97', letterSpacing: '0.1em' }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#479ffa', fontWeight: 600 }}>{value}</a>
      ) : (
        <span style={{ fontSize: 12, color: '#e6e6e6', fontWeight: 600 }}>{value}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/AboutCard.tsx
git commit -m "feat(stock): add AboutCard widget"
```

---

### Task D4: `NewsItem`

**Files:**
- Create: `web/src/components/stock/widgets/NewsItem.tsx`
- Test: `web/src/test/NewsItem.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewsItem } from '../components/stock/widgets/NewsItem'

describe('NewsItem', () => {
  it('renderiza título e fonte', () => {
    render(<NewsItem title="BB sobe forte" source="Reuters" url="https://r.com/x"
      published_at="2026-05-14" sentiment="POS" />)
    expect(screen.getByText('BB sobe forte')).toBeInTheDocument()
    expect(screen.getByText('Reuters')).toBeInTheDocument()
  })

  it('link tem target _blank', () => {
    render(<NewsItem title="t" source="s" url="https://x.com" published_at={null} sentiment={null} />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd web && npm run test -- --run src/test/NewsItem.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implementar**

`web/src/components/stock/widgets/NewsItem.tsx`:

```tsx
interface NewsItemProps {
  title: string; source: string
  url: string | null; published_at: string | null
  sentiment: 'POS' | 'NEG' | 'NEU' | null
  summary?: string | null
}

const COLORS = {
  POS: { bg: 'rgba(78,190,150,0.12)', fg: '#4ebe96' },
  NEG: { bg: 'rgba(255,107,107,0.12)', fg: '#ff6b6b' },
  NEU: { bg: 'rgba(134,143,151,0.12)', fg: '#868f97' },
}

export function NewsItem({ title, source, url, published_at, sentiment, summary }: NewsItemProps) {
  const sentLabel = sentiment ? { POS: 'POS', NEG: 'NEG', NEU: 'NEU' }[sentiment] : null
  const Wrap: any = url ? 'a' : 'div'
  const wrapProps: any = url
    ? { href: url, target: '_blank', rel: 'noopener noreferrer' }
    : {}
  return (
    <Wrap {...wrapProps} style={{
      display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 18, alignItems: 'center',
      padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
      textDecoration: 'none', cursor: url ? 'pointer' : 'default',
    }}>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}>
        {published_at || '—'}
      </span>
      <div>
        <div style={{ fontSize: 14, color: '#e6e6e6', lineHeight: 1.5 }}>{title}</div>
        {summary && (
          <div style={{ fontSize: 11, color: '#868f97', marginTop: 5, fontFamily: 'monospace' }}>
            {summary}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {sentLabel && (
          <span style={{ fontFamily: 'monospace', fontSize: 9, padding: '2px 7px', borderRadius: 4,
            fontWeight: 700, ...COLORS[sentiment!] }}>{sentLabel}</span>
        )}
        <span style={{ fontFamily: 'monospace', fontSize: 10, padding: '3px 9px', borderRadius: 999,
          background: 'rgba(71,159,250,0.08)', color: '#479ffa',
          border: '1px solid rgba(71,159,250,0.2)' }}>{source}</span>
      </div>
    </Wrap>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd web && npm run test -- --run src/test/NewsItem.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/stock/widgets/NewsItem.tsx web/src/test/NewsItem.test.tsx
git commit -m "feat(stock): add NewsItem widget"
```

---

### Task D5: `IndicatorRow` + `PivotsTable`

**Files:**
- Create: `web/src/components/stock/widgets/IndicatorRow.tsx`
- Create: `web/src/components/stock/widgets/PivotsTable.tsx`

- [ ] **Step 1: Implementar `IndicatorRow.tsx`**

```tsx
interface Props { name: string; value: number | null; signal: string }

const COLORS = {
  BUY:     { bg: 'rgba(78,190,150,0.12)', fg: '#4ebe96', label: 'Compra' },
  SELL:    { bg: 'rgba(255,107,107,0.12)', fg: '#ff6b6b', label: 'Venda' },
  NEUTRAL: { bg: 'rgba(134,143,151,0.15)', fg: '#868f97', label: 'Neutro' },
}

export function IndicatorRow({ name, value, signal }: Props) {
  const c = (COLORS as any)[signal] || COLORS.NEUTRAL
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 10, alignItems: 'center',
      padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: 12, color: '#cccccc' }}>{name}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e6e6e6', textAlign: 'right' }}>
        {value != null ? value : '—'}
      </span>
      <span style={{ justifySelf: 'end', padding: '3px 9px', borderRadius: 999,
        fontSize: 9, fontFamily: 'monospace', fontWeight: 700, background: c.bg, color: c.fg }}>
        {c.label}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Implementar `PivotsTable.tsx`**

```tsx
interface PivotRow {
  method: string; p: number | null
  r1: number | null; r2: number | null; r3: number | null
  s1: number | null; s2: number | null; s3: number | null
}

interface Props { pivots: PivotRow[] }

const METHOD_LABELS: Record<string, string> = {
  classic: 'Clássico', fibonacci: 'Fibonacci',
  camarilla: 'Camarilla', woodie: 'Woodie', demark: 'DeMark',
}

export function PivotsTable({ pivots }: Props) {
  const fmt = (v: number | null) => v != null ? v.toFixed(2) : '—'
  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr repeat(7, 1fr)', gap: 10,
        padding: '9px 12px', color: '#868f97', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.1em', borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'monospace',
      }}>
        <span>Tipo</span><span>S3</span><span>S2</span><span>S1</span>
        <span>P</span><span>R1</span><span>R2</span><span>R3</span>
      </div>
      {pivots.map((p) => (
        <div key={p.method} style={{
          display: 'grid', gridTemplateColumns: '1fr repeat(7, 1fr)', gap: 10,
          padding: '9px 12px', fontFamily: 'monospace', fontSize: 11,
          color: '#cccccc', borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <span style={{ color: '#e6e6e6', fontWeight: 600 }}>{METHOD_LABELS[p.method] || p.method}</span>
          <span>{fmt(p.s3)}</span><span>{fmt(p.s2)}</span><span>{fmt(p.s1)}</span>
          <span style={{ color: '#ffa16c', fontWeight: 700 }}>{fmt(p.p)}</span>
          <span>{fmt(p.r1)}</span><span>{fmt(p.r2)}</span><span>{fmt(p.r3)}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/stock/widgets/IndicatorRow.tsx \
        web/src/components/stock/widgets/PivotsTable.tsx
git commit -m "feat(stock): add IndicatorRow and PivotsTable widgets"
```

---

## Fase E — Widgets gráficos (SVG)

### Task E1: `PieChartSVG`

**Files:**
- Create: `web/src/components/stock/widgets/PieChartSVG.tsx`

- [ ] **Step 1: Implementar**

```tsx
export interface PieSlice { label: string; value: number; color: string; sub?: string }
interface Props { slices: PieSlice[]; size?: number }

export function PieChartSVG({ slices, size = 130 }: Props) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1
  const r = 40, c = 50
  const circumference = 2 * Math.PI * r
  let acc = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx={c} cy={c} r={r} fill="transparent"
          stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        {slices.map((s, i) => {
          const frac = s.value / total
          const dash = frac * circumference
          const gap = circumference - dash
          const rotate = (acc / total) * 360 - 90
          acc += s.value
          return (
            <circle key={i} cx={c} cy={c} r={r} fill="transparent"
              stroke={s.color} strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotate} ${c} ${c})`} />
          )
        })}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#cccccc' }}>{s.label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#e6e6e6' }}>
                {s.sub ?? `${(s.value / total * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/PieChartSVG.tsx
git commit -m "feat(stock): add PieChartSVG widget"
```

---

### Task E2: `BarChartSVG` com tooltip

**Files:**
- Create: `web/src/components/stock/widgets/BarChartSVG.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useState } from 'react'

export interface BarDatum { label: string; value: number; color?: string }
interface Props { data: BarDatum[]; height?: number; format?: (v: number) => string }

export function BarChartSVG({ data, height = 160, format }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 100 / data.length
  const fmt = format || ((v) => v.toLocaleString('pt-BR'))

  return (
    <div style={{ position: 'relative', height }}>
      <svg width="100%" height="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 20)
          const x = i * w + w * 0.15
          const bw = w * 0.7
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={height - h - 18} width={bw} height={h}
                fill={d.color || '#ffa16c'} rx="2" opacity={hover === i ? 1 : 0.85}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }} />
              <text x={x + bw/2} y={height - 4} textAnchor="middle"
                fill="#868f97" fontSize="9" fontFamily="monospace">{d.label}</text>
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div style={{
          position: 'absolute', top: 4, left: `${(hover + 0.5) * w}%`, transform: 'translateX(-50%)',
          background: 'rgba(19,19,19,0.95)', border: '1px solid rgba(255,255,255,0.1)',
          padding: '6px 10px', borderRadius: 6, fontSize: 11, color: '#e6e6e6',
          fontFamily: 'monospace', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          <div style={{ color: '#868f97', fontSize: 9 }}>{data[hover].label}</div>
          <div>{fmt(data[hover].value)}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/BarChartSVG.tsx
git commit -m "feat(stock): add BarChartSVG widget with hover tooltip"
```

---

### Task E3: `GaugeWidget`

**Files:**
- Create: `web/src/components/stock/widgets/GaugeWidget.tsx`

- [ ] **Step 1: Implementar**

```tsx
interface Props {
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'
  counts?: Record<string, number>
  periods?: { today: string; week: string; month: string }
  size?: 'sm' | 'lg'
}

const ANGLES = { STRONG_SELL: -75, SELL: -40, NEUTRAL: 0, BUY: 40, STRONG_BUY: 75 }
const LABELS = {
  STRONG_SELL: 'VIÉS DE BAIXA FORTE', SELL: 'TENDÊNCIA DE BAIXA',
  NEUTRAL: 'TENDÊNCIA NEUTRA',
  BUY: 'VIÉS DE ALTA', STRONG_BUY: 'VIÉS DE ALTA FORTE',
}
const COLORS = {
  STRONG_SELL: '#ff6b6b', SELL: '#ff6b6b',
  NEUTRAL: '#868f97', BUY: '#4ebe96', STRONG_BUY: '#4ebe96',
}

export function GaugeWidget({ signal, counts, periods, size = 'sm' }: Props) {
  const angle = ANGLES[signal] ?? 0
  const color = COLORS[signal]
  const svgW = size === 'lg' ? 280 : 220
  const svgH = size === 'lg' ? 160 : 130

  const x2 = 110 + Math.cos((angle - 90) * Math.PI / 180) * 70
  const y2 = 110 + Math.sin((angle - 90) * Math.PI / 180) * 70

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={svgW} height={svgH} viewBox="0 0 220 130">
        <defs>
          <linearGradient id="gaugeArc" x1="0" x2="1">
            <stop offset="0%" stopColor="#ff6b6b"/>
            <stop offset="50%" stopColor="#868f97"/>
            <stop offset="100%" stopColor="#4ebe96"/>
          </linearGradient>
        </defs>
        <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={size === 'lg' ? 22 : 18} strokeLinecap="round"/>
        <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none"
          stroke="url(#gaugeArc)" strokeWidth={size === 'lg' ? 22 : 18}
          strokeLinecap="round" opacity="0.75"/>
        <line x1="110" y1="110" x2={x2} y2={y2}
          stroke={color} strokeWidth={size === 'lg' ? 4 : 3} strokeLinecap="round"/>
        <circle cx="110" cy="110" r={size === 'lg' ? 8 : 6} fill={color}/>
        <circle cx="110" cy="110" r={size === 'lg' ? 4 : 3} fill="#131313"/>
      </svg>
      <div style={{ fontSize: size === 'lg' ? 24 : 18, fontWeight: 800,
        color, letterSpacing: '0.02em' }}>{LABELS[signal]}</div>
      {counts && (
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>
          {counts.SELL || 0} venda · {counts.NEUTRAL || 0} neutro · {counts.BUY || 0} compra
        </div>
      )}
      {periods && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%',
          paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {(['today','week','month'] as const).map(p => {
            const lbl = { today: 'Hoje', week: '1 semana', month: '1 mês' }[p]
            const sig = periods[p] as keyof typeof COLORS
            return (
              <div key={p} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97' }}>{lbl}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS[sig] || '#868f97' }}>
                  {sig.replace('_', ' ')}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/GaugeWidget.tsx
git commit -m "feat(stock): add GaugeWidget"
```

---

### Task E4: `DotsChartSVG` (estimativas)

**Files:**
- Create: `web/src/components/stock/widgets/DotsChartSVG.tsx`

- [ ] **Step 1: Implementar**

```tsx
export interface DotsPoint { period: string; reported?: number | null; estimate?: number | null }
interface Props { data: DotsPoint[]; height?: number }

export function DotsChartSVG({ data, height = 180 }: Props) {
  if (data.length === 0) return null
  const allVals = data.flatMap(d => [d.reported, d.estimate].filter((x): x is number => x != null))
  const max = Math.max(...allVals, 1)
  const min = Math.min(...allVals, 0)
  const range = max - min || 1
  const w = 320 / data.length

  const yFor = (v: number) => height - 30 - ((v - min) / range) * (height - 60)

  return (
    <svg width="100%" height={height} viewBox={`0 0 320 ${height}`}>
      <line x1="0" y1={height/2} x2="320" y2={height/2}
        stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4"/>
      {data.map((d, i) => {
        const x = (i + 0.5) * w
        return (
          <g key={i}>
            {d.reported != null && (
              <circle cx={x} cy={yFor(d.reported)} r="6" fill="#479ffa">
                <title>{d.period}: reportado {d.reported}</title>
              </circle>
            )}
            {d.estimate != null && (
              <circle cx={x} cy={yFor(d.estimate)} r="5" fill="transparent"
                stroke="#ffa16c" strokeWidth="2">
                <title>{d.period}: estimado {d.estimate}</title>
              </circle>
            )}
            <text x={x} y={height - 8} textAnchor="middle"
              fill="#868f97" fontSize="9" fontFamily="monospace">{d.period}</text>
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/DotsChartSVG.tsx
git commit -m "feat(stock): add DotsChartSVG widget"
```

---

### Task E5: `SeasonalsBars` (mini, 12 meses)

**Files:**
- Create: `web/src/components/stock/widgets/SeasonalsBars.tsx`

- [ ] **Step 1: Implementar**

```tsx
import type { SeasonalMonth } from '../../../lib/stockApi'

interface Props { months: SeasonalMonth[] }

const MONTH_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function SeasonalsBars({ months }: Props) {
  if (!months.length) return null
  const max = Math.max(...months.map(m => Math.abs(m.avg_return_pct)), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4,
      height: 140, alignItems: 'end' }}>
      {months.map((m) => {
        const pos = m.avg_return_pct >= 0
        const h = (Math.abs(m.avg_return_pct) / max) * 100
        return (
          <div key={m.month} style={{ display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%', minHeight: 2, height: `${h}px`,
              borderRadius: pos ? '3px 3px 0 0' : '0 0 3px 3px',
              background: pos
                ? 'linear-gradient(to top, #4ebe96, rgba(78,190,150,0.4))'
                : 'linear-gradient(to bottom, #ff6b6b, rgba(255,107,107,0.4))',
            }}/>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97' }}>
              {MONTH_LABEL[m.month - 1]}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 8,
              color: pos ? '#4ebe96' : '#ff6b6b' }}>
              {pos ? '+' : ''}{m.avg_return_pct.toFixed(1)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/SeasonalsBars.tsx
git commit -m "feat(stock): add SeasonalsBars mini widget"
```

---

### Task E6: `SeasonalsOverlay` (curvas sobrepostas)

**Files:**
- Create: `web/src/components/stock/widgets/SeasonalsOverlay.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useState } from 'react'
import type { SeasonalMonth, SeasonalYear } from '../../../lib/stockApi'

interface Props { avg: SeasonalMonth[]; years: SeasonalYear[] }

const MONTH_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const YEAR_COLORS = ['#479ffa', '#4ebe96', '#f06292', '#00bcd4', '#bb86fc']

function cumulativeReturn(monthData: { month: number; return_pct: number }[]): number[] {
  const sorted = [...monthData].sort((a, b) => a.month - b.month)
  let cum = 100
  return sorted.map(d => { cum *= (1 + d.return_pct / 100); return cum })
}

export function SeasonalsOverlay({ avg, years }: Props) {
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const showAvg = !hidden.has(-1)
  const W = 1200, H = 360, padL = 40, padR = 20

  const avgCum: number[] = []
  let c = 100
  ;[...avg].sort((a, b) => a.month - b.month).forEach(m => {
    c *= (1 + m.avg_return_pct / 100); avgCum.push(c)
  })
  const yearLines = years.map((y, i) => ({
    year: y.year, color: YEAR_COLORS[i % YEAR_COLORS.length],
    points: cumulativeReturn(y.data),
  }))
  const allValues = [...avgCum, ...yearLines.flatMap(y => y.points)]
  const maxV = Math.max(...allValues, 100), minV = Math.min(...allValues, 100)
  const range = maxV - minV || 1

  const xFor = (i: number) => padL + (i / 11) * (W - padL - padR)
  const yFor = (v: number) => 30 + (1 - (v - minV) / range) * (H - 60)

  const pathFor = (pts: number[]) => {
    if (!pts.length) return ''
    return pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`).join(' ')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Chip color="#ffa16c" label="Média 5A" active={showAvg}
          onClick={() => setHidden(h => { const n = new Set(h); n.has(-1) ? n.delete(-1) : n.add(-1); return n })} />
        {yearLines.map(y => (
          <Chip key={y.year} color={y.color} label={String(y.year)}
            active={!hidden.has(y.year)}
            onClick={() => setHidden(h => { const n = new Set(h); n.has(y.year) ? n.delete(y.year) : n.add(y.year); return n })} />
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ height: 380 }}>
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={padL} y1={30 + p * (H - 60)} x2={W - padR} y2={30 + p * (H - 60)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray={p === 0.5 ? '' : '2 4'} />
        ))}
        {yearLines.filter(y => !hidden.has(y.year)).map(y => (
          <path key={y.year} d={pathFor(y.points)} fill="none" stroke={y.color}
            strokeWidth="1.5" opacity="0.4"/>
        ))}
        {showAvg && (
          <path d={pathFor(avgCum)} fill="none" stroke="#ffa16c" strokeWidth="3"/>
        )}
        {MONTH_LABEL.map((m, i) => (
          <text key={i} x={xFor(i)} y={H - 6} textAnchor="middle"
            fontFamily="monospace" fontSize="11" fill="#868f97">{m}</text>
        ))}
      </svg>
    </div>
  )
}

function Chip({ color, label, active, onClick }: { color: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 999, fontFamily: 'monospace', fontSize: 10,
      border: `1px solid ${active ? color + '66' : 'rgba(255,255,255,0.1)'}`,
      background: active ? color + '14' : 'transparent',
      color: active ? '#e6e6e6' : '#868f97', cursor: 'pointer',
    }}>● {label}</button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/SeasonalsOverlay.tsx
git commit -m "feat(stock): add SeasonalsOverlay widget"
```

---

### Task E7: `IdeaCard` (análise FinSwarm)

**Files:**
- Create: `web/src/components/stock/widgets/IdeaCard.tsx`

- [ ] **Step 1: Implementar**

```tsx
import type { AnalysisRow } from '../../../lib/types'

interface Props { analysis: AnalysisRow; onClick: () => void }

const REC_STYLE: Record<string, { bg: string; border: string; fg: string; label: string }> = {
  BUY:  { bg: 'rgba(78,190,150,0.12)', border: 'rgba(78,190,150,0.3)', fg: '#4ebe96', label: 'COMPRAR' },
  HOLD: { bg: 'rgba(134,143,151,0.12)', border: 'rgba(134,143,151,0.3)', fg: '#868f97', label: 'NEUTRO' },
  SELL: { bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.3)', fg: '#ff6b6b', label: 'VENDER' },
}

export function IdeaCard({ analysis, onClick }: Props) {
  const rec = REC_STYLE[analysis.recommendation] || REC_STYLE.HOLD
  const date = new Date(analysis.created_at).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  return (
    <div className="glass" onClick={onClick} style={{ padding: 20, cursor: 'pointer', transition: 'all 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #479ffa, #2a7fdf)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'white',
        }}>7A</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#e6e6e6', fontWeight: 500 }}>Análise FinSwarm</div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#868f97' }}>{date}</div>
        </div>
        <span style={{
          padding: '3px 9px', borderRadius: 999, fontFamily: 'monospace', fontSize: 9,
          fontWeight: 700, background: rec.bg, color: rec.fg,
          border: `1px solid ${rec.border}`,
        }}>{rec.label}</span>
      </div>
      <div style={{
        height: 90, background: 'rgba(255,255,255,0.03)', borderRadius: 8,
        marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', fontSize: 9, color: '#868f97',
      }}>
        confiança {Math.round(analysis.confidence * 100)}%
      </div>
      <div style={{ display: 'flex', gap: 14, fontFamily: 'monospace', fontSize: 10, color: '#868f97' }}>
        <span>📊 {Math.round(analysis.confidence * 100)}%</span>
        <span>{analysis.ticker}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/widgets/IdeaCard.tsx
git commit -m "feat(stock): add IdeaCard widget for past FinSwarm analyses"
```

---

## Fase F — Panels (1 por aba)

### Task F1: `TabBar` + `StockHeader`

**Files:**
- Create: `web/src/components/stock/TabBar.tsx`
- Create: `web/src/components/stock/StockHeader.tsx`

- [ ] **Step 1: Implementar `TabBar.tsx`**

```tsx
export type TabName = 'overview' | 'financials' | 'news' | 'community' | 'technicals' | 'forecast' | 'seasonals' | 'bonds'

interface Props {
  active: TabName
  onChange: (t: TabName) => void
  newsCount?: number
  communityCount?: number
}

const TABS: { id: TabName; label: string }[] = [
  { id: 'overview',   label: 'Visão geral'    },
  { id: 'financials', label: 'Finanças'       },
  { id: 'news',       label: 'Notícias'       },
  { id: 'community',  label: 'Comunidade'     },
  { id: 'technicals', label: 'Sinais técnicos'},
  { id: 'forecast',   label: 'Previsões'      },
  { id: 'seasonals',  label: 'Sazonais'       },
  { id: 'bonds',      label: 'Títulos'        },
]

export function TabBar({ active, onChange, newsCount, communityCount }: Props) {
  return (
    <div role="tablist" style={{
      display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '0 32px', background: 'rgba(255,255,255,0.02)',
      backdropFilter: 'blur(20px)', borderRadius: '16px 16px 0 0',
      border: '1px solid rgba(255,255,255,0.07)', marginBottom: 24,
    }}>
      {TABS.map(t => {
        const isActive = active === t.id
        const count = t.id === 'news' ? newsCount : t.id === 'community' ? communityCount : undefined
        return (
          <button key={t.id} role="tab" aria-selected={isActive}
            onClick={() => onChange(t.id)}
            style={{
              padding: '16px 22px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              color: isActive ? '#ffa16c' : '#868f97', background: 'transparent',
              border: 'none', borderBottom: `2px solid ${isActive ? '#ffa16c' : 'transparent'}`,
              fontWeight: isActive ? 600 : 400, position: 'relative', top: 1,
              transition: 'all 0.15s',
            }}>
            {t.label}
            {count != null && count > 0 && (
              <span style={{ fontFamily: 'monospace', fontSize: 9, opacity: 0.6,
                marginLeft: 4 }}>{count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Implementar `StockHeader.tsx`**

```tsx
import { CompanyLogo } from '../CompanyLogo'

interface Props {
  ticker: string
  longName: string | null
  price: number | null
  change: number | null
  changePct: number | null
  prevClose: number | null
  loading?: boolean
}

export function StockHeader({ ticker, longName, price, change, changePct, prevClose, loading }: Props) {
  const positive = (change ?? 0) >= 0
  const fmt = (v: number | null) => v != null ? v.toLocaleString('pt-BR',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

  return (
    <div className="glass-strong" style={{
      padding: '24px 32px', marginBottom: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 32, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <CompanyLogo ticker={ticker} size={64} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#868f97' }}>
            {longName || '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 6px' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#e6e6e6',
              letterSpacing: '-0.02em' }}>{ticker}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, padding: '3px 9px',
              background: 'rgba(71,159,250,0.1)', border: '1px solid rgba(71,159,250,0.25)',
              borderRadius: 999, color: '#479ffa', textTransform: 'uppercase' }}>B3 · BMFBOVESPA</span>
          </div>
        </div>
      </div>
      {loading || price == null ? (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#868f97' }}
          className="animate-pulse-blue">carregando cotação...</div>
      ) : (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#e6e6e6',
            letterSpacing: '-0.02em', lineHeight: 1 }}>R$ {fmt(price)}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600,
            color: positive ? '#4ebe96' : '#ff6b6b', marginTop: 6 }}>
            {positive ? '+' : ''}{fmt(change)} ({positive ? '+' : ''}{fmt(changePct)}%)
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#868f97', marginTop: 4 }}>
            Fechamento anterior: R$ {fmt(prevClose)}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/stock/TabBar.tsx web/src/components/stock/StockHeader.tsx
git commit -m "feat(stock): add TabBar and StockHeader components"
```

---

### Task F2: `OverviewPanel`

**Files:**
- Create: `web/src/components/stock/panels/OverviewPanel.tsx`

- [ ] **Step 1: Implementar**

```tsx
import type { OverviewResponse } from '../../../lib/stockApi'
import { PriceChart } from '../../PriceChart'
import { KPICard } from '../widgets/KPICard'
import { KPIGrid } from '../widgets/KPIGrid'
import { AboutCard } from '../widgets/AboutCard'
import { PieChartSVG } from '../widgets/PieChartSVG'
import { GaugeWidget } from '../widgets/GaugeWidget'
import { SeasonalsBars } from '../widgets/SeasonalsBars'
import { NewsItem } from '../widgets/NewsItem'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: OverviewResponse | null; loading: boolean; ticker: string }

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1e12) return `R$ ${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `R$ ${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `R$ ${(v / 1e6).toFixed(0)}M`
  return `R$ ${v.toLocaleString('pt-BR')}`
}
function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—'
  return `${v.toFixed(decimals)}%`
}
function fmtNum(v: number | null | undefined, suffix = '×', decimals = 2): string {
  if (v == null) return '—'
  return `${v.toFixed(decimals)}${suffix}`
}

export function OverviewPanel({ data, loading, ticker }: Props) {
  if (loading || !data) {
    return (
      <div>
        <SkeletonCard height={320} />
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} height={80}/>)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="glass" style={{ padding: '18px 22px' }}>
        <PriceChart ticker={`${ticker}.SA`} height={320} />
      </div>

      <KPIGrid columns={6}>
        <KPICard label="Valor de mercado" value={fmtCurrency(data.kpis.mkt_cap)} />
        <KPICard label="Div. yield" value={fmtPct(data.kpis.div_yield)} />
        <KPICard label="P/L 12M" value={fmtNum(data.kpis.pl_12m)} />
        <KPICard label="EPS 12M" value={data.kpis.eps_12m != null ? `R$ ${data.kpis.eps_12m.toFixed(2)}` : '—'} />
        <KPICard label="Beta" value={fmtNum(data.kpis.beta, '', 2)} />
        <KPICard label="Lucro líq." value={fmtCurrency(data.kpis.last_quarter_profit)} />
      </KPIGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AboutCard summary={data.profile.summary}
          ceo={data.profile.ceo} founded={data.profile.founded}
          employees={data.profile.employees} website={data.profile.website} />

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
            Controle acionário
          </h3>
          <PieChartSVG slices={[
            { label: 'Insiders', value: data.shareholders.closely_held_pct ?? 0,
              color: '#479ffa', sub: fmtPct((data.shareholders.closely_held_pct ?? 0) * 100, 2) },
            { label: 'Free Float', value: data.shareholders.free_float_pct ?? 0,
              color: '#ffa16c', sub: fmtPct((data.shareholders.free_float_pct ?? 0) * 100, 2) },
          ]} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        <div className="glass" style={{ padding: '20px 22px' }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
            Notícias recentes
          </h3>
          {data.news_preview.length === 0
            ? <div style={{ fontSize: 12, color: '#868f97' }}>Sem notícias disponíveis.</div>
            : data.news_preview.slice(0, 4).map((n, i) => (
                <NewsItem key={i} {...n} />
              ))
          }
        </div>

        <div className="glass" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
            Sinais técnicos
          </h3>
          <GaugeWidget signal={data.technicals_summary.signal as any}
            counts={data.technicals_summary.counts}
            periods={{
              today: data.technicals_summary.today,
              week:  data.technicals_summary.week,
              month: data.technicals_summary.month,
            }} />
        </div>
      </div>

      <div className="glass" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
          Sazonalidade (média 5A)
        </h3>
        <SeasonalsBars months={data.seasonals_mini} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/panels/OverviewPanel.tsx
git commit -m "feat(stock): add OverviewPanel"
```

---

### Task F3: `FinancialsPanel` com sub-tabs

**Files:**
- Create: `web/src/components/stock/panels/FinancialsPanel.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useState } from 'react'
import type { FinancialsResponse } from '../../../lib/stockApi'
import { KPICard } from '../widgets/KPICard'
import { KPIGrid } from '../widgets/KPIGrid'
import { BarChartSVG } from '../widgets/BarChartSVG'
import { PieChartSVG } from '../widgets/PieChartSVG'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: FinancialsResponse | null; loading: boolean }

const SUBTABS = ['Visão geral', 'Demonstrações', 'Estatísticas', 'Dividendos', 'Resultados', 'Receita']

function fmtCurr(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1e12) return `R$ ${(v/1e12).toFixed(1)}T`
  if (v >= 1e9)  return `R$ ${(v/1e9).toFixed(1)}B`
  if (v >= 1e6)  return `R$ ${(v/1e6).toFixed(0)}M`
  return `R$ ${v.toLocaleString('pt-BR')}`
}
function fmtPct(v: number | null, d = 2): string { return v != null ? `${(v*100).toFixed(d)}%` : '—' }

export function FinancialsPanel({ data, loading }: Props) {
  const [active, setActive] = useState(0)
  if (loading || !data) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} height={220}/>)}
    </div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {SUBTABS.map((label, i) => (
          <button key={label} onClick={() => setActive(i)} style={{
            padding: '7px 16px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
            background: i === active ? 'rgba(71,159,250,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${i === active ? 'rgba(71,159,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: i === active ? '#479ffa' : '#868f97',
          }}>{label}</button>
        ))}
      </div>

      {/* Linha 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Fatos principais</h3>
          <KPIGrid columns={2}>
            <KPICard label="Mkt Cap" value={fmtCurr(data.facts.mkt_cap)} />
            <KPICard label="Div. Yld" value={fmtPct(data.facts.div_yield)} />
            <KPICard label="P/L 12M" value={data.facts.pl_12m != null ? `${data.facts.pl_12m.toFixed(2)}×` : '—'} />
            <KPICard label="EPS 12M" value={data.facts.eps_12m != null ? `R$ ${data.facts.eps_12m.toFixed(2)}` : '—'} />
          </KPIGrid>
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Estrutura de capital</h3>
          <BarChartSVG data={[
            { label: 'Mkt Cap', value: data.capital_structure.mkt_cap ?? 0, color: '#479ffa' },
            { label: 'Dívida',  value: data.capital_structure.debt ?? 0, color: '#ffa16c' },
            { label: 'Caixa',   value: data.capital_structure.cash ?? 0, color: '#4ebe96' },
            { label: 'EV',      value: data.capital_structure.enterprise_value ?? 0, color: '#00bcd4' },
          ]} format={fmtCurr} />
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Valoração</h3>
          <PieChartSVG slices={[
            { label: 'Mkt Cap', value: data.valuation.revenue ?? 0, color: '#479ffa', sub: fmtCurr(data.valuation.revenue) },
            { label: 'Receita', value: data.valuation.net_income ?? 0, color: '#ffa16c', sub: fmtCurr(data.valuation.net_income) },
          ]} />
        </div>
      </div>

      {/* Linha 2: Crescimento + Rentabilidade + Dividendos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Crescimento (receita)</h3>
          <BarChartSVG data={data.growth.map(g => ({
            label: String(g.year), value: g.revenue ?? 0, color: '#ffa16c'
          }))} format={fmtCurr}/>
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Rentabilidade</h3>
          {(['roe','roa','net_margin','ebit_margin'] as const).map(k => (
            <div key={k} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#cccccc' }}>{k.toUpperCase().replace('_',' ')}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4ebe96', fontWeight: 700 }}>
                  {fmtPct(data.profitability[k], 1)}
                </span>
              </div>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                <span style={{ display: 'block', height: '100%', borderRadius: 999,
                  width: `${Math.min(Math.abs((data.profitability[k] ?? 0) * 100 * 4), 100)}%`,
                  background: 'linear-gradient(90deg, #4ebe96, rgba(78,190,150,0.5))' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Dividendos</h3>
          <BarChartSVG data={data.dividends_history.map(d => ({
            label: String(d.year), value: d.dps ?? 0, color: '#f06292'
          }))} format={(v) => `R$ ${v.toFixed(2)}`} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/panels/FinancialsPanel.tsx
git commit -m "feat(stock): add FinancialsPanel with sub-tabs"
```

---

### Task F4: `NewsPanel`

**Files:**
- Create: `web/src/components/stock/panels/NewsPanel.tsx`

- [ ] **Step 1: Implementar**

```tsx
import type { NewsResponse } from '../../../lib/stockApi'
import { NewsItem } from '../widgets/NewsItem'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: NewsResponse | null; loading: boolean }

export function NewsPanel({ data, loading }: Props) {
  if (loading || !data) {
    return <div className="glass" style={{ padding: 22 }}>
      {[1,2,3,4,5].map(i => <SkeletonCard key={i} height={70} className="" />)}
    </div>
  }
  if (data.items.length === 0) {
    return <div className="glass" style={{ padding: 32, textAlign: 'center', color: '#868f97' }}>
      Sem notícias disponíveis no momento.
    </div>
  }
  return (
    <div className="glass" style={{ padding: '26px 32px' }}>
      <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
        Notícias recentes
      </h3>
      {data.items.map((n, i) => <NewsItem key={i} {...n} />)}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/panels/NewsPanel.tsx
git commit -m "feat(stock): add NewsPanel"
```

---

### Task F5: `CommunityPanel` (análises FinSwarm)

**Files:**
- Create: `web/src/components/stock/panels/CommunityPanel.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useEffect, useState } from 'react'
import type { AnalysisRow } from '../../../lib/types'
import { fetchAnalyses } from '../../../lib/api'
import { IdeaCard } from '../widgets/IdeaCard'
import { SkeletonCard } from '../widgets/SkeletonCard'
import { HistoryModal } from '../../HistoryModal'

interface Props { ticker: string }

export function CommunityPanel({ ticker }: Props) {
  const [rows, setRows]       = useState<AnalysisRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/analyses?ticker=${encodeURIComponent(ticker)}`)
      .then(r => r.json())
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {[1,2,3].map(i => <SkeletonCard key={i} height={220} />)}
    </div>
  }

  return (
    <>
      <div className="glass-accent" style={{ padding: '18px 22px', fontSize: 12, color: '#cccccc',
        lineHeight: 1.6, marginBottom: 16 }}>
        💡 <strong style={{ color: '#ffa16c' }}>Comunidade FinSwarm</strong> — análises multi-agente
        anteriores feitas neste ativo. Cada card representa uma execução completa dos 7 agentes.
      </div>

      {rows && rows.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: 'center', color: '#868f97' }}>
          Nenhuma análise feita ainda neste ticker. Rode a primeira clicando em
          <strong style={{ color: '#ffa16c' }}> Analisar com FinSwarm </strong>no rodapé.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {(rows || []).map(r => (
            <IdeaCard key={r.job_id} analysis={r} onClick={() => setSelected(r.job_id)} />
          ))}
        </div>
      )}

      <HistoryModal jobId={selected} onClose={() => setSelected(null)} />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/panels/CommunityPanel.tsx
git commit -m "feat(stock): add CommunityPanel showing past FinSwarm analyses"
```

---

### Task F6: `TechnicalsPanel`

**Files:**
- Create: `web/src/components/stock/panels/TechnicalsPanel.tsx`

- [ ] **Step 1: Implementar**

```tsx
import type { TechnicalsResponse } from '../../../lib/stockApi'
import { GaugeWidget } from '../widgets/GaugeWidget'
import { IndicatorRow } from '../widgets/IndicatorRow'
import { PivotsTable } from '../widgets/PivotsTable'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: TechnicalsResponse | null; loading: boolean }

export function TechnicalsPanel({ data, loading }: Props) {
  if (loading || !data) {
    return <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr 1fr', gap: 16 }}>
      {[1,2,3].map(i => <SkeletonCard key={i} height={380}/>)}
    </div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Resumo geral</h3>
          <GaugeWidget signal={data.summary.signal as any}
            counts={data.summary.counts}
            periods={{ today: data.summary.today, week: data.summary.week, month: data.summary.month }}
            size="lg" />
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Osciladores</h3>
          {data.oscillators.map(i => <IndicatorRow key={i.name} {...i} />)}
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>Médias móveis</h3>
          {data.moving_averages.map(i => <IndicatorRow key={i.name} {...i} />)}
        </div>
      </div>

      <div className="glass" style={{ padding: '22px 28px' }}>
        <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 14, fontWeight: 600 }}>
          Pontos de pivô (diários)
        </h3>
        <PivotsTable pivots={data.pivots} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/panels/TechnicalsPanel.tsx
git commit -m "feat(stock): add TechnicalsPanel"
```

---

### Task F7: `ForecastPanel`

**Files:**
- Create: `web/src/components/stock/panels/ForecastPanel.tsx`

- [ ] **Step 1: Implementar**

```tsx
import type { ForecastResponse } from '../../../lib/stockApi'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: ForecastResponse | null; loading: boolean }

const REC_LABELS: Record<string, string> = {
  strong_buy: 'Compra forte', buy: 'Compra',
  hold: 'Neutro', sell: 'Venda', strong_sell: 'Venda forte',
}
const REC_COLORS: Record<string, string> = {
  strong_buy: '#4ebe96', buy: 'rgba(78,190,150,0.55)',
  hold: '#868f97', sell: 'rgba(255,107,107,0.5)', strong_sell: '#ff6b6b',
}

export function ForecastPanel({ data, loading }: Props) {
  if (loading || !data) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <SkeletonCard height={320}/><SkeletonCard height={320}/>
    </div>
  }
  const t = data.price_target
  const current = t.current ?? 0
  const upside = t.target_mean ? ((t.target_mean - current) / current * 100) : null
  const maxCount = Math.max(...Object.values(data.recommendations), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 18, fontWeight: 600 }}>
            Preço-alvo de analistas
          </h3>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: '#ffa16c',
              letterSpacing: '-0.02em' }}>
              R$ {t.target_mean ? t.target_mean.toFixed(2) : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#868f97', fontFamily: 'monospace', marginTop: 2 }}>
              Médio · {upside != null ? `${upside > 0 ? '+' : ''}${upside.toFixed(1)}%` : '—'} vs atual
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ff6b6b' }}>
                R$ {t.target_low?.toFixed(0) ?? '—'}
              </div>
              <div style={{ fontSize: 9, color: '#868f97' }}>mín</div>
            </div>
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)',
              position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '12%', right: '8%', height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #ff6b6b, #ffa16c, #4ebe96)' }} />
              <div style={{ position: 'absolute', top: -5, left: '30%', width: 16, height: 16,
                borderRadius: '50%', background: '#ffa16c', border: '3px solid #131313',
                boxShadow: '0 0 12px rgba(255,161,108,0.6)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4ebe96' }}>
                R$ {t.target_high?.toFixed(0) ?? '—'}
              </div>
              <div style={{ fontSize: 9, color: '#868f97' }}>máx</div>
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 18, fontWeight: 600 }}>
            Classificação de analistas
          </h3>
          {Object.entries(REC_LABELS).map(([key, label]) => {
            const count = data.recommendations[key] || 0
            const pct = (count / maxCount) * 100
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 30px',
                gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#868f97' }}>{label}</span>
                <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 999,
                    width: `${pct}%`, background: REC_COLORS[key] }} />
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e6e6e6', textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/panels/ForecastPanel.tsx
git commit -m "feat(stock): add ForecastPanel"
```

---

### Task F8: `SeasonalsPanel`

**Files:**
- Create: `web/src/components/stock/panels/SeasonalsPanel.tsx`

- [ ] **Step 1: Implementar**

```tsx
import type { SeasonalsResponse } from '../../../lib/stockApi'
import { SeasonalsOverlay } from '../widgets/SeasonalsOverlay'
import { SkeletonCard } from '../widgets/SkeletonCard'

interface Props { data: SeasonalsResponse | null; loading: boolean }

export function SeasonalsPanel({ data, loading }: Props) {
  if (loading || !data) return <SkeletonCard height={480}/>
  return (
    <div className="glass" style={{ padding: '26px 32px' }}>
      <h3 style={{ fontSize: 14, color: '#e6e6e6', marginBottom: 18, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 14, background: '#ffa16c', borderRadius: 2 }}/>
        Comportamento sazonal histórico
      </h3>
      <SeasonalsOverlay avg={data.monthly_avg_5y} years={data.years} />
      <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: 12, color: '#cccccc', lineHeight: 1.6, maxWidth: 880 }}>
        Padrões sazonais mostram o comportamento histórico médio do ativo ao longo do ano.
        Use como referência, não como garantia.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/panels/SeasonalsPanel.tsx
git commit -m "feat(stock): add SeasonalsPanel"
```

---

### Task F9: `BondsPanel` placeholder

**Files:**
- Create: `web/src/components/stock/panels/BondsPanel.tsx`

- [ ] **Step 1: Implementar**

```tsx
export function BondsPanel() {
  return (
    <div className="glass" style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📜</div>
      <h3 style={{ fontSize: 18, color: '#e6e6e6', fontWeight: 600, marginBottom: 8 }}>
        Títulos corporativos — em breve
      </h3>
      <p style={{ fontSize: 13, color: '#868f97', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
        Integração com fontes de dados de bonds corporativos (Anbima / B3) planejada
        para uma próxima versão. Por enquanto, foque na análise de ações na barra acima.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/stock/panels/BondsPanel.tsx
git commit -m "feat(stock): add BondsPanel placeholder"
```

---

## Fase G — Integração final

### Task G1: Reescrever `StockDetail.tsx` como orquestrador

**Files:**
- Modify: `web/src/pages/StockDetail.tsx`

- [ ] **Step 1: Substituir conteúdo de `web/src/pages/StockDetail.tsx`**

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TabBar, TabName } from '../components/stock/TabBar'
import { StockHeader } from '../components/stock/StockHeader'
import { OverviewPanel } from '../components/stock/panels/OverviewPanel'
import { FinancialsPanel } from '../components/stock/panels/FinancialsPanel'
import { NewsPanel } from '../components/stock/panels/NewsPanel'
import { CommunityPanel } from '../components/stock/panels/CommunityPanel'
import { TechnicalsPanel } from '../components/stock/panels/TechnicalsPanel'
import { ForecastPanel } from '../components/stock/panels/ForecastPanel'
import { SeasonalsPanel } from '../components/stock/panels/SeasonalsPanel'
import { BondsPanel } from '../components/stock/panels/BondsPanel'
import { ErrorBanner } from '../components/ErrorBanner'
import {
  fetchOverview, fetchFinancials, fetchStockNews,
  fetchTechnicals, fetchForecastData, fetchSeasonals,
} from '../lib/stockApi'
import { useStockData } from '../lib/useStockData'
import { ApiError, postAnalyze } from '../lib/api'

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const tickerBase = (ticker ?? '').toUpperCase().replace(/\.SA$/i, '')
  const tickerSA = `${tickerBase}.SA`

  const [tab, setTab] = useState<TabName>('overview')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overview   = useStockData(tickerBase, 'overview',   fetchOverview)
  const financials = useStockData(tickerBase, 'financials', fetchFinancials,   tab === 'financials')
  const news       = useStockData(tickerBase, 'news',       fetchStockNews,    tab === 'news')
  const technicals = useStockData(tickerBase, 'technicals', fetchTechnicals,   tab === 'technicals')
  const forecast   = useStockData(tickerBase, 'forecast',   fetchForecastData, tab === 'forecast')
  const seasonals  = useStockData(tickerBase, 'seasonals',  fetchSeasonals,    tab === 'seasonals')

  async function handleAnalyze() {
    setSubmitting(true); setError(null)
    try {
      const job = await postAnalyze(tickerSA)
      navigate(`/analysis/${job.job_id}`, { state: { ticker: tickerSA } })
    } catch (e) {
      setError(e instanceof ApiError
        ? `Erro ${e.status}: ${e.message}`
        : 'Não foi possível iniciar a análise.')
      setSubmitting(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '28px 56px 100px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
        <button onClick={() => navigate('/')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
          borderRadius: 8, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', color: '#868f97',
          fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
        }}>← Voltar</button>
        <span style={{ fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: '#479ffa' }}>FinSwarm · B3</span>
      </div>

      <StockHeader
        ticker={tickerBase}
        longName={overview.data?.profile.long_name ?? null}
        price={overview.data?.quote.price ?? null}
        change={overview.data?.quote.change ?? null}
        changePct={overview.data?.quote.change_pct ?? null}
        prevClose={overview.data?.quote.prev_close ?? null}
        loading={overview.loading}
      />

      <TabBar active={tab} onChange={setTab}
        newsCount={overview.data?.news_preview?.length}
        communityCount={undefined} />

      {tab === 'overview'   && <OverviewPanel   data={overview.data}   loading={overview.loading}   ticker={tickerBase}/>}
      {tab === 'financials' && <FinancialsPanel data={financials.data} loading={financials.loading}/>}
      {tab === 'news'       && <NewsPanel       data={news.data}       loading={news.loading}/>}
      {tab === 'community'  && <CommunityPanel  ticker={tickerBase}/>}
      {tab === 'technicals' && <TechnicalsPanel data={technicals.data} loading={technicals.loading}/>}
      {tab === 'forecast'   && <ForecastPanel   data={forecast.data}   loading={forecast.loading}/>}
      {tab === 'seasonals'  && <SeasonalsPanel  data={seasonals.data}  loading={seasonals.loading}/>}
      {tab === 'bonds'      && <BondsPanel/>}

      {error && <div style={{ marginTop: 16 }}><ErrorBanner message={error} /></div>}

      <div className="glass-strong" style={{
        position: 'sticky', bottom: 24, padding: '20px 32px', marginTop: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <b style={{ fontSize: 14, color: '#e6e6e6' }}>Pronto para rodar a análise multi-agente?</b>
          <span style={{ fontSize: 11, color: '#868f97' }}>
            7 agentes LLM avaliam técnico, fundamentos, sentimento e risco em ~30s
          </span>
        </div>
        <button onClick={handleAnalyze} disabled={submitting} style={{
          padding: '14px 28px', borderRadius: 12, border: 'none',
          background: submitting
            ? 'rgba(255,161,108,0.3)'
            : 'linear-gradient(135deg, #ffa16c 0%, #ff6b35 100%)',
          color: '#131313', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
          cursor: submitting ? 'not-allowed' : 'pointer',
          boxShadow: '0 8px 24px rgba(255,161,108,0.3)',
        }}>
          {submitting ? 'Iniciando análise...' : `Analisar ${tickerBase} com FinSwarm →`}
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/StockDetail.tsx
git commit -m "feat(stock): rewrite StockDetail as multi-tab orchestrator"
```

---

### Task G2: Smoke test end-to-end manual

**Files:** (sem mudanças de código)

- [ ] **Step 1: Reiniciar backend**

```bash
pkill -f "uvicorn src.api" 2>/dev/null; sleep 1
cd /home/mateus/finswarm && poetry run uvicorn src.api:app --port 8000 --ws wsproto &
sleep 4
```
Expected: backend rodando em `127.0.0.1:8000`.

- [ ] **Step 2: Garantir frontend rodando**

```bash
pgrep -af vite | grep -v grep || (cd web && npm run dev &)
```

- [ ] **Step 3: Bater nos 6 endpoints novos manualmente**

```bash
curl -s http://localhost:8000/stock/PETR4/overview     | head -c 200; echo
curl -s http://localhost:8000/stock/PETR4/financials   | head -c 200; echo
curl -s http://localhost:8000/stock/PETR4/news         | head -c 200; echo
curl -s http://localhost:8000/stock/PETR4/technicals   | head -c 200; echo
curl -s http://localhost:8000/stock/PETR4/forecast     | head -c 200; echo
curl -s http://localhost:8000/stock/PETR4/seasonals    | head -c 200; echo
```
Expected: cada um retorna JSON válido (não 404, não erro).

- [ ] **Step 4: Validar critérios de aceitação no browser**

Abrir `http://localhost:5173/stock/PETR4` e checar:

- [ ] Header com preço renderiza em < 2s
- [ ] 8 abas visíveis na barra
- [ ] Visão geral mostra chart + KPIs + perfil + controle + notícias + gauge + sazonais
- [ ] Trocar para Finanças mostra 6 cards de finanças
- [ ] Trocar para Notícias mostra feed; cada item é clicável e abre URL em nova aba
- [ ] Trocar para Comunidade mostra cards de análises (ou empty state) e clicar abre HistoryModal
- [ ] Trocar para Sinais técnicos mostra gauge + osciladores + MAs + pivôs
- [ ] Trocar para Previsões mostra preço-alvo + classificação analistas
- [ ] Trocar para Sazonais mostra gráfico de curvas sobrepostas com seletor de anos
- [ ] Trocar para Títulos mostra placeholder "em breve"
- [ ] Voltar para uma aba já visitada → instantâneo (cache de sessão)
- [ ] Hover sobre barras dos gráficos → tooltip aparece
- [ ] Botão "Analisar X com FinSwarm" inicia análise normalmente

- [ ] **Step 5: Rodar suite completa de testes**

```bash
cd /home/mateus/finswarm && poetry run pytest -q 2>&1 | tail -10
cd web && npm run test -- --run 2>&1 | tail -10
cd web && npx tsc --noEmit 2>&1 | head -5
cd web && npm run build 2>&1 | tail -5
```
Expected: tudo verde, build verde.

- [ ] **Step 6: Atualizar STATUS.md**

Em `docs/STATUS.md`, substituir a seção "Visual Overhaul (2026-05-13)" com nota da nova feature. Exemplo de bloco a acrescentar no topo do "Onde estamos":

```md
- **StockDetail v2 com 8 abas (2026-05-14) — implementado:**
  - 7 abas funcionais: Visão geral, Finanças, Notícias, Comunidade FinSwarm, Sinais técnicos, Previsões, Sazonais
  - 1 placeholder: Títulos ("em breve")
  - Backend: 6 endpoints REST sob /stock/:ticker, cache 2 camadas (memória + SQLite em data/stock_cache.db)
  - Frontend: ~15 widgets reaproveitáveis, gráficos SVG inline, useStockData com cache de sessão
```

- [ ] **Step 7: Commit final**

```bash
git add docs/STATUS.md
git commit -m "docs: update STATUS.md with StockDetail v2 (8 tabs)"
```

---

## Resumo da decomposição

| Fase | Tasks | Output |
|------|-------|--------|
| A | 7 (A1-A7) | Cache, technicals, seasonals, models, sentiment |
| B | 7 (B1-B7) | 6 endpoints + filtro ticker em /analyses |
| C | 3 (C1-C3) | stockApi, useStockData, vite proxy + CSS |
| D | 5 (D1-D5) | SkeletonCard, KPICard/Grid, AboutCard, NewsItem, IndicatorRow/PivotsTable |
| E | 7 (E1-E7) | Gráficos SVG: Pie, Bar, Gauge, Dots, SeasonalsBars, SeasonalsOverlay, IdeaCard |
| F | 9 (F1-F9) | TabBar/StockHeader + 8 panels |
| G | 2 (G1-G2) | Integração + smoke test |

**Total: 40 tasks**. Cada uma é commit isolado, testável de forma independente. As fases A+B produzem software testável via `curl` (backend completo). As fases C-F produzem componentes isolados. Apenas G amarra tudo.

## Cobertura do spec (self-review)

| Requisito do spec | Task(s) |
|---|---|
| Cache 2 camadas (memória + SQLite) | A2 |
| 6 endpoints REST sob /stock/:ticker | B1-B6 |
| Cálculos técnicos (osciladores, MAs, pivôs) | A3, A4 |
| Sazonais por agregação mensal | A5 |
| Pydantic response models | A6 |
| Sentimento batch via LLMClient | A7 |
| Filtro ?ticker= em /analyses | B7 |
| stockApi.ts com tipos e fetchers | C2 |
| useStockData hook com session cache | C3 |
| Estética glass + blobs | C1, F1, G1 |
| 8 panels (7 funcionais + 1 placeholder) | F1-F9 |
| TabBar com underline animado | F1 |
| StockHeader com preço/ações | F1 |
| Gráficos SVG inline (Pie, Bar, Gauge, Dots, Seasonals) | E1-E6 |
| Notícia clicável abre URL | D4 (NewsItem), F4 (NewsPanel) |
| Tooltips em gráficos | E2 (BarChartSVG) |
| Cards Comunidade abrem HistoryModal | F5 (CommunityPanel) |
| CTA sticky com postAnalyze | G1 |
| Critérios de aceitação validados | G2 |
