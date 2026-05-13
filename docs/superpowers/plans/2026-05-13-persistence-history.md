# Persistência + Histórico de Análises — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir resultados de análises em SQLite e exibir histórico em drawer lateral sempre visível na Home, com busca por ticker, filtro por recomendação e visualização do relatório completo via modal overlay.

**Architecture:** Backend adiciona `src/db.py` (aiosqlite), chama `save_analysis` ao fim de cada job e expõe `GET /analyses` + `GET /analyses/{job_id}`. Frontend adiciona `HistoryDrawer` (sempre visível na coluna direita da Home) e `HistoryModal` (overlay com ReportHero + AgentSlots read-only).

**Tech Stack:** Python/aiosqlite (backend), React/TypeScript/Vitest/RTL (frontend), Tailwind v4, React Router 6.

---

## Mapa de arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/db.py` |
| Criar | `tests/unit/test_db.py` |
| Criar | `tests/unit/test_api_history.py` |
| Modificar | `src/models.py` — adicionar `AnalysisRow` |
| Modificar | `src/api.py` — lifespan, endpoints, save_analysis |
| Modificar | `pyproject.toml` — adicionar aiosqlite |
| Modificar | `web/src/lib/types.ts` — adicionar `AnalysisRow` |
| Modificar | `web/src/lib/api.ts` — `fetchAnalyses`, `fetchAnalysis` |
| Criar | `web/src/components/HistoryDrawer.tsx` |
| Criar | `web/src/components/HistoryModal.tsx` |
| Criar | `web/src/test/HistoryDrawer.test.tsx` |
| Criar | `web/src/test/HistoryModal.test.tsx` |
| Modificar | `web/src/pages/Home.tsx` — layout 2 colunas |

---

## Task 1: Adicionar dependência aiosqlite + modelo AnalysisRow

**Files:**
- Modify: `pyproject.toml`
- Modify: `src/models.py`

- [ ] **Step 1: Adicionar aiosqlite ao projeto**

```bash
cd ~/finswarm && poetry add aiosqlite
```

Esperado: linha `aiosqlite = "^0.20"` aparece em `pyproject.toml`.

- [ ] **Step 2: Adicionar AnalysisRow em `src/models.py`**

Abrir `src/models.py` e adicionar após a classe `WsEvent`:

```python
class AnalysisRow(BaseModel):
    job_id: str
    ticker: str
    timestamp: datetime
    recommendation: Literal["COMPRAR", "MANTER", "VENDER"]
    confidence: float
    risk_score: int
```

- [ ] **Step 3: Verificar que os modelos existentes ainda importam sem erro**

```bash
poetry run python -c "from src.models import AnalysisRow; print('ok')"
```

Esperado: `ok`

- [ ] **Step 4: Commit**

```bash
git add pyproject.toml poetry.lock src/models.py
git commit -m "feat: add aiosqlite dep and AnalysisRow model"
```

---

## Task 2: Criar `src/db.py` (TDD)

**Files:**
- Create: `src/db.py`
- Create: `tests/unit/test_db.py`

- [ ] **Step 1: Escrever os testes**

Criar `tests/unit/test_db.py`:

```python
from __future__ import annotations
import pytest
from datetime import datetime
from pathlib import Path

from src.db import init_db, save_analysis, list_analyses, get_analysis
from src.models import AnalysisResult, AnalysisRow, AgentOutput

_AGENTS = {
    name: AgentOutput(status="ok", summary="ok")
    for name in ["technical", "fundamental", "sentiment", "bull", "bear", "risk", "synthesis"]
}


def make_result(job_id: str = "abc123", ticker: str = "PETR4.SA") -> AnalysisResult:
    return AnalysisResult(
        job_id=job_id,
        ticker=ticker,
        timestamp=datetime(2026, 5, 13, 14, 32, 0),
        recommendation="COMPRAR",
        confidence=0.82,
        risk_score=31,
        stop_loss_pct=5.0,
        agents=_AGENTS,
        elapsed_seconds=142.0,
    )


@pytest.fixture
async def db(tmp_path: Path) -> Path:
    p = tmp_path / "test.db"
    await init_db(p)
    return p


async def test_init_db_creates_table(db: Path) -> None:
    await save_analysis(make_result(), db)
    rows = await list_analyses(db)
    assert len(rows) == 1


async def test_save_and_retrieve(db: Path) -> None:
    result = make_result()
    await save_analysis(result, db)
    retrieved = await get_analysis(result.job_id, db)
    assert retrieved is not None
    assert retrieved.job_id == result.job_id
    assert retrieved.ticker == result.ticker
    assert retrieved.recommendation == result.recommendation
    assert retrieved.confidence == pytest.approx(result.confidence)


async def test_save_is_idempotent(db: Path) -> None:
    result = make_result()
    await save_analysis(result, db)
    await save_analysis(result, db)
    rows = await list_analyses(db)
    assert len(rows) == 1


async def test_list_ordered_by_timestamp_desc(db: Path) -> None:
    r1 = make_result("job1", "PETR4.SA").model_copy(
        update={"timestamp": datetime(2026, 5, 13, 10, 0)}
    )
    r2 = make_result("job2", "VALE3.SA").model_copy(
        update={"timestamp": datetime(2026, 5, 13, 14, 0)}
    )
    await save_analysis(r1, db)
    await save_analysis(r2, db)
    rows = await list_analyses(db)
    assert rows[0].job_id == "job2"
    assert rows[1].job_id == "job1"


async def test_list_returns_analysis_row_type(db: Path) -> None:
    await save_analysis(make_result(), db)
    rows = await list_analyses(db)
    assert isinstance(rows[0], AnalysisRow)


async def test_get_analysis_not_found(db: Path) -> None:
    result = await get_analysis("nonexistent", db)
    assert result is None
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
poetry run pytest tests/unit/test_db.py -v
```

Esperado: `ModuleNotFoundError: No module named 'src.db'` ou similar — FAIL.

- [ ] **Step 3: Implementar `src/db.py`**

Criar `src/db.py`:

```python
from __future__ import annotations
from pathlib import Path

import aiosqlite

from src.models import AnalysisResult, AnalysisRow

DB_PATH = Path(__file__).parent.parent / "data" / "analyses.db"


async def init_db(db_path: Path = DB_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                job_id         TEXT PRIMARY KEY,
                ticker         TEXT NOT NULL,
                timestamp      TEXT NOT NULL,
                recommendation TEXT NOT NULL,
                confidence     REAL NOT NULL,
                risk_score     INTEGER NOT NULL,
                result_json    TEXT NOT NULL
            )
            """
        )
        await db.commit()


async def save_analysis(result: AnalysisResult, db_path: Path = DB_PATH) -> None:
    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            """
            INSERT OR REPLACE INTO analyses
              (job_id, ticker, timestamp, recommendation, confidence, risk_score, result_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.job_id,
                result.ticker,
                result.timestamp.isoformat(),
                result.recommendation,
                result.confidence,
                result.risk_score,
                result.model_dump_json(),
            ),
        )
        await db.commit()


async def list_analyses(db_path: Path = DB_PATH) -> list[AnalysisRow]:
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT job_id, ticker, timestamp, recommendation, confidence, risk_score "
            "FROM analyses ORDER BY timestamp DESC"
        ) as cursor:
            rows = await cursor.fetchall()
    return [AnalysisRow.model_validate(dict(row)) for row in rows]


async def get_analysis(job_id: str, db_path: Path = DB_PATH) -> AnalysisResult | None:
    async with aiosqlite.connect(db_path) as db:
        async with db.execute(
            "SELECT result_json FROM analyses WHERE job_id = ?", (job_id,)
        ) as cursor:
            row = await cursor.fetchone()
    if row is None:
        return None
    return AnalysisResult.model_validate_json(row[0])
```

- [ ] **Step 4: Rodar testes para confirmar aprovação**

```bash
poetry run pytest tests/unit/test_db.py -v
```

Esperado: 6 testes PASSED.

- [ ] **Step 5: Commit**

```bash
git add src/db.py tests/unit/test_db.py
git commit -m "feat: add SQLite persistence module (src/db.py)"
```

---

## Task 3: Wiring no `api.py` — lifespan, endpoints, save_analysis

**Files:**
- Modify: `src/api.py`
- Create: `tests/unit/test_api_history.py`

- [ ] **Step 1: Escrever os testes dos novos endpoints**

Criar `tests/unit/test_api_history.py`:

```python
from __future__ import annotations
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api import app
from src.models import AnalysisResult, AnalysisRow, AgentOutput

_AGENTS = {
    name: AgentOutput(status="ok", summary="ok")
    for name in ["technical", "fundamental", "sentiment", "bull", "bear", "risk", "synthesis"]
}

_MOCK_ROW = AnalysisRow(
    job_id="abc123",
    ticker="PETR4.SA",
    timestamp=datetime(2026, 5, 13, 14, 32, 0),
    recommendation="COMPRAR",
    confidence=0.82,
    risk_score=31,
)

_MOCK_RESULT = AnalysisResult(
    job_id="abc123",
    ticker="PETR4.SA",
    timestamp=datetime(2026, 5, 13, 14, 32, 0),
    recommendation="COMPRAR",
    confidence=0.82,
    risk_score=31,
    stop_loss_pct=5.0,
    agents=_AGENTS,
    elapsed_seconds=142.0,
)


@pytest.fixture(autouse=True)
def mock_init_db(mocker):
    mocker.patch("src.api.init_db", new_callable=AsyncMock)


def test_get_analyses_empty():
    with patch("src.api.list_analyses", new_callable=AsyncMock, return_value=[]):
        with TestClient(app) as client:
            resp = client.get("/analyses")
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_analyses_returns_list():
    with patch("src.api.list_analyses", new_callable=AsyncMock, return_value=[_MOCK_ROW]):
        with TestClient(app) as client:
            resp = client.get("/analyses")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["job_id"] == "abc123"
    assert data[0]["ticker"] == "PETR4.SA"
    assert data[0]["recommendation"] == "COMPRAR"


def test_get_analysis_by_id():
    with patch("src.api.get_analysis", new_callable=AsyncMock, return_value=_MOCK_RESULT):
        with TestClient(app) as client:
            resp = client.get("/analyses/abc123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == "abc123"
    assert data["confidence"] == pytest.approx(0.82)


def test_get_analysis_not_found():
    with patch("src.api.get_analysis", new_callable=AsyncMock, return_value=None):
        with TestClient(app) as client:
            resp = client.get("/analyses/naoexiste")
    assert resp.status_code == 404
    assert "não encontrada" in resp.json()["detail"]
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
poetry run pytest tests/unit/test_api_history.py -v
```

Esperado: FAIL — endpoints não existem ainda.

- [ ] **Step 3: Atualizar `src/api.py`**

Substituir o conteúdo de `src/api.py`:

```python
from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import field_validator

from src.db import init_db, save_analysis, list_analyses, get_analysis
from src.llm.client import LLMClient
from src.models import AnalysisRequest, AnalysisResult, AnalysisRow, JobStatus, WsEvent
from src.orchestrator import run_analysis

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="FinSwarm", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

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


@app.get("/analyses", response_model=list[AnalysisRow])
async def get_analyses():
    return await list_analyses()


@app.get("/analyses/{job_id}", response_model=AnalysisResult)
async def get_analysis_result(job_id: str):
    result = await get_analysis(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="análise não encontrada")
    return result


@app.post("/analyze", status_code=202, response_model=JobStatus)
async def start_analysis(request: AnalysisRequestValidated, background_tasks: BackgroundTasks):
    job_id = uuid4().hex[:8]
    queue: asyncio.Queue = asyncio.Queue()
    _jobs[job_id] = queue
    llm = LLMClient()
    background_tasks.add_task(_run_and_store, job_id, request.ticker, llm, queue)
    return JobStatus(job_id=job_id, ticker=request.ticker, status="running")


async def _run_and_store(job_id: str, ticker: str, llm: LLMClient, queue: asyncio.Queue):
    async def push_event(agent: str, status: str, elapsed: float):
        event_type = "agent_start" if status == "running" else "agent_done"
        await queue.put(WsEvent(event=event_type, agent=agent, elapsed=elapsed))

    try:
        result = await run_analysis(ticker, llm, job_id=job_id, progress_callback=push_event)
        _results[job_id] = result
        await queue.put(WsEvent(event="done", result=result, elapsed=result.elapsed_seconds))
        await save_analysis(result)
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
        _results.pop(job_id, None)
```

- [ ] **Step 4: Rodar testes do history e os existentes**

```bash
poetry run pytest tests/unit/test_api_history.py tests/unit/test_api.py -v
```

Esperado: todos PASSED.

- [ ] **Step 5: Commit**

```bash
git add src/api.py tests/unit/test_api_history.py
git commit -m "feat: add GET /analyses endpoints and lifespan persistence"
```

---

## Task 4: Frontend — tipo AnalysisRow + funções de API

**Files:**
- Modify: `web/src/lib/types.ts`
- Modify: `web/src/lib/api.ts`

- [ ] **Step 1: Adicionar `AnalysisRow` em `web/src/lib/types.ts`**

Adicionar antes do último `export` do arquivo:

```typescript
export interface AnalysisRow {
  job_id: string
  ticker: string
  timestamp: string
  recommendation: Recommendation
  confidence: number
  risk_score: number
}
```

- [ ] **Step 2: Adicionar funções em `web/src/lib/api.ts`**

Primeiro, atualizar a linha de import existente no topo do arquivo de:
```typescript
import type { JobStatus } from './types'
```
para:
```typescript
import type { JobStatus, AnalysisRow, AnalysisResult } from './types'
```

Depois adicionar no final do arquivo (sem novo import):

```typescript
export async function fetchAnalyses(): Promise<AnalysisRow[]> {
  const response = await fetch('/analyses')
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body)
    } catch { /* keep statusText */ }
    throw new ApiError(response.status, detail)
  }
  return response.json() as Promise<AnalysisRow[]>
}

export async function fetchAnalysis(jobId: string): Promise<AnalysisResult> {
  const response = await fetch(`/analyses/${jobId}`)
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body)
    } catch { /* keep statusText */ }
    throw new ApiError(response.status, detail)
  }
  return response.json() as Promise<AnalysisResult>
}
```

**Atenção:** remover as linhas de `import type` do trecho acima se `types.ts` já está importado no topo do arquivo. Verificar imports existentes e unificar.

- [ ] **Step 3: Verificar build TypeScript**

```bash
cd ~/finswarm/web && npm run build 2>&1 | tail -5
```

Esperado: `built in Xs` sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/api.ts
git commit -m "feat: add AnalysisRow type and fetchAnalyses/fetchAnalysis"
```

---

## Task 5: Componente `HistoryDrawer` (TDD)

**Files:**
- Create: `web/src/components/HistoryDrawer.tsx`
- Create: `web/src/test/HistoryDrawer.test.tsx`

- [ ] **Step 1: Escrever os testes**

Criar `web/src/test/HistoryDrawer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { HistoryDrawer } from '../components/HistoryDrawer'
import * as api from '../lib/api'
import type { AnalysisRow } from '../lib/types'

const mockRows: AnalysisRow[] = [
  { job_id: 'job1', ticker: 'PETR4', timestamp: '2026-05-13T14:32:00', recommendation: 'COMPRAR', confidence: 0.82, risk_score: 31 },
  { job_id: 'job2', ticker: 'VALE3', timestamp: '2026-05-12T10:00:00', recommendation: 'MANTER', confidence: 0.61, risk_score: 55 },
  { job_id: 'job3', ticker: 'ITUB4', timestamp: '2026-05-11T09:00:00', recommendation: 'VENDER', confidence: 0.74, risk_score: 77 },
]

describe('HistoryDrawer', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchAnalyses').mockResolvedValue(mockRows)
  })

  it('exibe estado vazio quando não há análises', async () => {
    vi.spyOn(api, 'fetchAnalyses').mockResolvedValue([])
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Nenhuma análise ainda')).toBeInTheDocument()
    })
  })

  it('renderiza a lista de análises', async () => {
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument()
      expect(screen.getByText('VALE3')).toBeInTheDocument()
      expect(screen.getByText('ITUB4')).toBeInTheDocument()
    })
  })

  it('filtra por recomendação ao clicar em chip', async () => {
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Comprar'))
    expect(screen.getByText('PETR4')).toBeInTheDocument()
    expect(screen.queryByText('VALE3')).not.toBeInTheDocument()
    expect(screen.queryByText('ITUB4')).not.toBeInTheDocument()
  })

  it('filtra por ticker na busca (case-insensitive)', async () => {
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar ticker...'), {
      target: { value: 'vale' },
    })
    expect(screen.queryByText('PETR4')).not.toBeInTheDocument()
    expect(screen.getByText('VALE3')).toBeInTheDocument()
  })

  it('chama onSelect com job_id ao clicar no item', async () => {
    const onSelect = vi.fn()
    render(<HistoryDrawer onSelect={onSelect} />)
    await waitFor(() => expect(screen.getByText('PETR4')).toBeInTheDocument())
    fireEvent.click(screen.getByText('PETR4').closest('button')!)
    expect(onSelect).toHaveBeenCalledWith('job1')
  })

  it('exibe erro quando fetchAnalyses rejeita', async () => {
    vi.spyOn(api, 'fetchAnalyses').mockRejectedValue(new Error('network'))
    render(<HistoryDrawer onSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar histórico')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd ~/finswarm/web && npx vitest run src/test/HistoryDrawer.test.tsx
```

Esperado: FAIL — `HistoryDrawer` não existe.

- [ ] **Step 3: Criar `web/src/components/HistoryDrawer.tsx`**

```tsx
import { useEffect, useState } from 'react'
import type { AnalysisRow, Recommendation } from '../lib/types'
import { fetchAnalyses } from '../lib/api'

interface HistoryDrawerProps {
  onSelect: (jobId: string) => void
}

type Filter = 'ALL' | Recommendation

const REC_CHIP: Record<Recommendation, string> = {
  COMPRAR: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  MANTER:  'border-yellow-500/25 text-yellow-400 bg-yellow-500/8',
  VENDER:  'border-red-500/25 text-red-400 bg-red-500/8',
}

const REC_LABEL: Record<Recommendation, string> = {
  COMPRAR: 'Comprar',
  MANTER:  'Manter',
  VENDER:  'Vender',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = now.toDateString() === d.toDateString()
  if (sameDay) return `hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (yesterday.toDateString() === d.toDateString()) return 'ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'Todas',   value: 'ALL' },
  { label: 'Comprar', value: 'COMPRAR' },
  { label: 'Manter',  value: 'MANTER' },
  { label: 'Vender',  value: 'VENDER' },
]

export function HistoryDrawer({ onSelect }: HistoryDrawerProps) {
  const [rows, setRows]     = useState<AnalysisRow[]>([])
  const [error, setError]   = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  useEffect(() => {
    fetchAnalyses().then(setRows).catch(() => setError(true))
  }, [])

  const filtered = rows.filter(r => {
    const matchRec    = filter === 'ALL' || r.recommendation === filter
    const matchSearch = r.ticker.includes(search.toUpperCase())
    return matchRec && matchSearch
  })

  return (
    <div className="glass rounded-lg flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-light-gray/15">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim-gray">
          Histórico
        </span>
        <span className="font-mono text-[11px] text-data-blue tabular-nums">{rows.length}</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <input
          type="text"
          placeholder="Buscar ticker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-dark-frost border border-light-gray/15 rounded-md px-3 py-1.5 font-mono text-[12px] text-polar-white placeholder:text-dim-gray focus:outline-none focus:border-data-blue/50"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3 pt-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md border transition-colors ${
              filter === f.value
                ? 'border-data-blue/50 text-data-blue bg-data-blue/10'
                : 'border-light-gray/15 text-dim-gray hover:border-light-gray/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 min-h-0">
        {error && (
          <p className="font-mono text-[10px] text-error text-center mt-4">
            Erro ao carregar histórico
          </p>
        )}
        {!error && rows.length === 0 && (
          <p className="font-mono text-[10px] text-dim-gray text-center mt-8">
            Nenhuma análise ainda
          </p>
        )}
        {!error && rows.length > 0 && filtered.length === 0 && (
          <p className="font-mono text-[10px] text-dim-gray text-center mt-8">
            Nenhum resultado
          </p>
        )}
        {filtered.map(row => (
          <button
            key={row.job_id}
            onClick={() => onSelect(row.job_id)}
            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md border border-light-gray/10 hover:border-data-blue/30 hover:bg-data-blue/5 transition-colors"
          >
            <span className="font-mono text-[12px] font-bold text-data-blue min-w-[52px]">
              {row.ticker}
            </span>
            <span className={`font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full border ${REC_CHIP[row.recommendation]}`}>
              {REC_LABEL[row.recommendation]}
            </span>
            <span className="font-mono text-[10px] text-dim-gray ml-auto whitespace-nowrap">
              {formatDate(row.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**

```bash
cd ~/finswarm/web && npx vitest run src/test/HistoryDrawer.test.tsx
```

Esperado: 6 testes PASSED.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/HistoryDrawer.tsx web/src/test/HistoryDrawer.test.tsx
git commit -m "feat: add HistoryDrawer component"
```

---

## Task 6: Componente `HistoryModal` (TDD)

**Files:**
- Create: `web/src/components/HistoryModal.tsx`
- Create: `web/src/test/HistoryModal.test.tsx`

- [ ] **Step 1: Escrever os testes**

Criar `web/src/test/HistoryModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HistoryModal } from '../components/HistoryModal'
import * as api from '../lib/api'
import type { AnalysisResult } from '../lib/types'

const mockResult: AnalysisResult = {
  job_id: 'job1',
  ticker: 'PETR4',
  timestamp: '2026-05-13T14:32:00',
  recommendation: 'COMPRAR',
  confidence: 0.82,
  risk_score: 31,
  stop_loss_pct: 5.0,
  agents: Object.fromEntries(
    ['technical', 'fundamental', 'sentiment', 'bull', 'bear', 'risk', 'synthesis'].map(n => [
      n, { status: 'ok' as const, summary: 'análise concluída', raw: {} },
    ])
  ) as AnalysisResult['agents'],
  elapsed_seconds: 142.0,
  cost_usd: 0.0,
}

describe('HistoryModal', () => {
  it('não renderiza nada quando jobId é null', () => {
    const { container } = render(<HistoryModal jobId={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('exibe skeleton de carregamento enquanto busca', () => {
    vi.spyOn(api, 'fetchAnalysis').mockImplementation(() => new Promise(() => {}))
    render(<HistoryModal jobId="job1" onClose={vi.fn()} />)
    expect(screen.getByText('Carregando análise...')).toBeInTheDocument()
  })

  it('renderiza o relatório quando fetch é bem-sucedido', async () => {
    vi.spyOn(api, 'fetchAnalysis').mockResolvedValue(mockResult)
    render(<HistoryModal jobId="job1" onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument()
    })
  })

  it('chama onClose ao pressionar ESC', () => {
    vi.spyOn(api, 'fetchAnalysis').mockImplementation(() => new Promise(() => {}))
    const onClose = vi.fn()
    render(<HistoryModal jobId="job1" onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('exibe mensagem de erro quando fetch falha', async () => {
    vi.spyOn(api, 'fetchAnalysis').mockRejectedValue(new Error('net'))
    render(<HistoryModal jobId="job1" onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar análise.')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
cd ~/finswarm/web && npx vitest run src/test/HistoryModal.test.tsx
```

Esperado: FAIL — `HistoryModal` não existe.

- [ ] **Step 3: Criar `web/src/components/HistoryModal.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { AGENT_ORDER, type AgentName, type AnalysisResult } from '../lib/types'
import { fetchAnalysis } from '../lib/api'
import { ReportHero } from './ReportHero'
import { AgentSlot } from './AgentSlot'

interface HistoryModalProps {
  jobId: string | null
  onClose: () => void
}

export function HistoryModal({ jobId, onClose }: HistoryModalProps) {
  const [result, setResult]   = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!jobId) { setResult(null); return }
    setLoading(true)
    setError(null)
    fetchAnalysis(jobId)
      .then(r  => { setResult(r); setLoading(false) })
      .catch(() => { setError('Erro ao carregar análise.'); setLoading(false) })
  }, [jobId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!jobId) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto px-6 py-10"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={panelRef} className="w-full max-w-3xl flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="font-mono text-[11px] text-dim-gray hover:text-polar-white transition-colors"
          >
            ✕ fechar
          </button>
        </div>

        {loading && (
          <div className="glass rounded-lg p-8 text-center">
            <span className="font-mono text-[11px] text-dim-gray animate-pulse">
              Carregando análise...
            </span>
          </div>
        )}

        {error && (
          <div className="glass rounded-lg p-8 text-center">
            <span className="font-mono text-[11px] text-error">{error}</span>
          </div>
        )}

        {result && !loading && (
          <>
            <ReportHero result={result} />
            <div className="flex flex-col gap-2.5">
              {AGENT_ORDER.map((name: AgentName) => (
                <AgentSlot
                  key={name}
                  agent={name}
                  status={result.agents[name].status}
                  elapsed={null}
                  output={result.agents[name]}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**

```bash
cd ~/finswarm/web && npx vitest run src/test/HistoryModal.test.tsx
```

Esperado: 5 testes PASSED.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/HistoryModal.tsx web/src/test/HistoryModal.test.tsx
git commit -m "feat: add HistoryModal component"
```

---

## Task 7: Atualizar `Home.tsx` — layout 2 colunas

**Files:**
- Modify: `web/src/pages/Home.tsx`

- [ ] **Step 1: Substituir o conteúdo de `web/src/pages/Home.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TickerInput } from '../components/TickerInput'
import { ErrorBanner } from '../components/ErrorBanner'
import { HistoryDrawer } from '../components/HistoryDrawer'
import { HistoryModal } from '../components/HistoryModal'
import { ApiError, postAnalyze } from '../lib/api'

export function Home() {
  const navigate = useNavigate()
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  async function handleSubmit(ticker: string) {
    setSubmitting(true)
    setError(null)
    try {
      const job = await postAnalyze(ticker)
      navigate(`/analysis/${job.job_id}`, { state: { ticker } })
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
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-[1216px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">

          {/* Coluna esquerda: hero + input */}
          <div className="flex flex-col items-start gap-8">
            <div className="flex flex-col gap-4">
              <span className="font-mono text-[11px] uppercase tracking-widest text-data-blue">
                FinSwarm · B3
              </span>
              <h1 className="text-[56px] font-semibold leading-[1.14] tracking-[-0.036px] text-polar-white">
                Análise multi-agente para a B3
              </h1>
              <p className="text-base text-silver-dust max-w-lg">
                Sete agentes LLM avaliam técnico, fundamentos, sentimento e risco
                para produzir uma recomendação fundamentada.
              </p>
            </div>
            <div className="w-full flex flex-col gap-3">
              {error && <ErrorBanner message={error} />}
              <TickerInput onSubmit={handleSubmit} disabled={submitting} />
            </div>
          </div>

          {/* Coluna direita: histórico */}
          <aside className="lg:sticky lg:top-8 lg:self-start h-[calc(100vh-96px)] flex flex-col">
            <HistoryDrawer onSelect={setSelectedJobId} />
          </aside>

        </div>
      </div>

      <HistoryModal jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </main>
  )
}
```

- [ ] **Step 2: Rodar suite completa de testes frontend**

```bash
cd ~/finswarm/web && npx vitest run
```

Esperado: todos os testes existentes PASSED (19+) + novos testes PASSED.

- [ ] **Step 3: Verificar build**

```bash
cd ~/finswarm/web && npm run build 2>&1 | tail -5
```

Esperado: `built in Xs` sem erros.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/Home.tsx
git commit -m "feat: wire HistoryDrawer and HistoryModal into Home (2-column layout)"
```

---

## Task 8: Verificação final integrada

- [ ] **Step 1: Rodar suite completa de testes backend**

```bash
cd ~/finswarm && poetry run pytest tests/unit/ -v --ignore=tests/integration
```

Esperado: todos PASSED (33+ testes existentes + novos testes de db e api_history).

- [ ] **Step 2: Subir backend e frontend e testar manualmente**

```bash
# Terminal 1
poetry run uvicorn src.api:app --port 8000 --ws wsproto

# Terminal 2
cd web && npm run dev
```

Fluxo a validar:
1. Abre `http://localhost:5173` — drawer "Histórico" aparece na coluna direita.
2. Roda uma análise (ex: `PETR4.SA`).
3. Ao concluir, volta para Home — o item aparece no drawer.
4. Clica no item — modal abre com o relatório completo.
5. Fecha com ESC ou botão "✕ fechar".
6. Filtra por "Comprar" — apenas análises com recomendação COMPRAR aparecem.
7. Busca por ticker — filtra corretamente.

- [ ] **Step 3: Garantir que `data/analyses.db` está no `.gitignore`**

Verificar se `data/` ou `*.db` já está em `~/finswarm/.gitignore`. Se não estiver, adicionar:

```bash
echo 'data/' >> ~/finswarm/.gitignore
git add .gitignore
git commit -m "chore: ignore SQLite data directory"
```

- [ ] **Step 4: Verificar arquivo de banco gerado**

```bash
ls -lh ~/finswarm/data/analyses.db
```

Esperado: arquivo existe com tamanho > 0.

- [ ] **Step 4: Atualizar STATUS.md**

Em `docs/STATUS.md`, marcar o to-do de persistência como concluído:
```markdown
### [x] Persistência de análises (SQLite — MVP)
```

- [ ] **Step 5: Commit final**

```bash
git add docs/STATUS.md
git commit -m "docs: mark SQLite persistence as complete in STATUS.md"
```
