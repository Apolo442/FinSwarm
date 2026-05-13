# FinSwarm — Persistência + Histórico de Análises

**Data:** 2026-05-13  
**Status:** aprovado  
**Escopo:** backend (SQLite) + frontend (drawer lateral + modal)

---

## Objetivo

Persistir os resultados de análises concluídas em SQLite e expor um histórico acessível direto na Home via drawer lateral sempre visível, com busca por ticker, filtro por recomendação e visualização completa do relatório em modal overlay.

---

## Arquitetura geral

```
┌─────────────────────────────────────────────────────────┐
│ Frontend                                                 │
│                                                          │
│  Home.tsx (2 colunas)                                    │
│  ├── col esquerda: hero + TickerInput                    │
│  └── col direita:  HistoryDrawer (sempre visível)        │
│                     ├── input busca ticker               │
│                     ├── chips filtro rec                 │
│                     ├── lista AnalysisRow                │
│                     └── abre HistoryModal ao clicar      │
│                                                          │
│  HistoryModal.tsx (overlay)                              │
│  ├── ReportHero (read-only, componente existente)        │
│  └── AgentSlot × 7 (read-only, componentes existentes)  │
└──────────────┬──────────────────────────────────────────┘
               │ GET /analyses
               │ GET /analyses/{job_id}
┌──────────────▼──────────────────────────────────────────┐
│ Backend (FastAPI)                                        │
│                                                          │
│  api.py                                                  │
│  ├── GET /analyses        → lista de AnalysisRow         │
│  ├── GET /analyses/{id}   → AnalysisResult completo      │
│  └── _run_and_store       → chama save_analysis() ao fim │
│                                                          │
│  src/db.py (novo)                                        │
│  ├── init_db()                                           │
│  ├── save_analysis(result)                               │
│  ├── list_analyses() → list[AnalysisRow]                 │
│  └── get_analysis(job_id) → AnalysisResult | None        │
│                                                          │
│  data/analyses.db  (SQLite, criado automaticamente)      │
└─────────────────────────────────────────────────────────┘
```

---

## Backend

### `src/db.py`

Único módulo de acesso ao banco. Usa `aiosqlite` (dep a adicionar).

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS analyses (
    job_id        TEXT PRIMARY KEY,
    ticker        TEXT NOT NULL,
    timestamp     TEXT NOT NULL,          -- ISO 8601
    recommendation TEXT NOT NULL,         -- COMPRAR | MANTER | VENDER
    confidence    REAL NOT NULL,
    risk_score    INTEGER NOT NULL,
    result_json   TEXT NOT NULL           -- AnalysisResult.model_dump_json()
);
```

**Funções:**

- `async def init_db(db_path: str) -> None` — cria tabela se não existir; chamada no `lifespan` do FastAPI.
- `async def save_analysis(result: AnalysisResult, db_path: str) -> None` — `INSERT OR REPLACE`.
- `async def list_analyses(db_path: str) -> list[AnalysisRow]` — `SELECT` das colunas de metadados (sem `result_json`), `ORDER BY timestamp DESC`.
- `async def get_analysis(job_id: str, db_path: str) -> AnalysisResult | None` — `SELECT result_json WHERE job_id = ?`, desserializa com `AnalysisResult.model_validate_json()`.

`db_path` default: `Path(__file__).parent.parent / "data" / "analyses.db"`. Diretório `data/` criado automaticamente se não existir.

### Modelo `AnalysisRow` (novo em `models.py`)

```python
class AnalysisRow(BaseModel):
    job_id: str
    ticker: str
    timestamp: datetime
    recommendation: Literal["COMPRAR", "MANTER", "VENDER"]
    confidence: float
    risk_score: int
```

### Novos endpoints em `api.py`

```
GET /analyses
  → 200: list[AnalysisRow]  (ordenado por timestamp DESC)

GET /analyses/{job_id}
  → 200: AnalysisResult
  → 404: {"detail": "análise não encontrada"}
```

`save_analysis` é invocado no final de `_run_and_store`, após o evento `done` ser enfileirado, somente quando `result` é `AnalysisResult` (não `Exception`).

`init_db` é chamado via `lifespan` (context manager async do FastAPI), não via `@app.on_event` (deprecated).

---

## Frontend

### Tipos novos em `lib/types.ts`

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

### `lib/api.ts` — duas funções novas

```typescript
fetchAnalyses(): Promise<AnalysisRow[]>
fetchAnalysis(jobId: string): Promise<AnalysisResult>
```

### `Home.tsx` — layout 2 colunas

```
<main> grid lg:grid-cols-[1fr_300px]
  ├── col esquerda  → hero + TickerInput  (existente, sem mudança)
  └── col direita   → <HistoryDrawer>
```

Em telas menores que `lg` (< 1024px), o drawer colapsa para baixo do hero (layout coluna única com drawer embaixo, com altura máxima fixa e scroll).

### `HistoryDrawer.tsx` (novo componente)

Estado local:
- `rows: AnalysisRow[]` — carregado via `useEffect` → `fetchAnalyses()`
- `search: string` — filtro de texto (ticker)
- `filter: 'ALL' | 'COMPRAR' | 'MANTER' | 'VENDER'`
- `selectedJobId: string | null` — controla abertura do modal

Lógica de filtragem: client-side sobre `rows` (sem roundtrip ao backend).

UI:
- Header: label "Histórico" + contador total
- Input de busca com ícone de lupa
- Chips: Todas / Comprar / Manter / Vender
- Lista scrollável de `HistoryItem` (ticker, chip rec, barra de confiança, data relativa)
- Estado vazio: "Nenhuma análise ainda" quando `rows.length === 0`
- Estado de erro: mensagem discreta se `fetchAnalyses` falhar

### `HistoryModal.tsx` (novo componente)

Props: `jobId: string | null`, `onClose: () => void`

Comportamento:
- Quando `jobId !== null`: chama `fetchAnalysis(jobId)`, exibe loading skeleton enquanto carrega.
- Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm z-50`
- Painel: `max-w-3xl mx-auto`, scrollável internamente
- Fecha com: clique no backdrop, tecla `ESC`, ou botão "×" no canto
- Conteúdo: `<ReportHero result={result} />` + 7 × `<AgentSlot>` em modo `output` (status sempre `ok` ou `failed`, sem elapsed interativo)
- `elapsed` passado como `null` para todos os agentes no modal (tempo por agente não é persistido em `AnalysisResult`, apenas o total em `elapsed_seconds`)
- `AgentSlot` já aceita `output` prop e `elapsed={null}` — sem modificação necessária no componente

### Atualização do drawer após nova análise

Quando o usuário retorna da página `/analysis/:jobId` para a Home (navegação via "← Nova análise"), o drawer deve recarregar a lista. Implementado via `key` no `HistoryDrawer` ou `useEffect` com dependência em `location.key` (React Router).

---

## Testes

### Backend

- `test_db.py` — testes unitários com banco em memória (`:memory:`):
  - `init_db` cria tabela
  - `save_analysis` persiste e é idempotente (`INSERT OR REPLACE`)
  - `list_analyses` retorna ordenado por timestamp DESC
  - `get_analysis` retorna `None` para job_id inexistente
- `test_api.py` — testes de integração dos novos endpoints com `httpx.AsyncClient`

### Frontend

- `HistoryDrawer.test.tsx`:
  - Renderiza "Nenhuma análise ainda" quando lista vazia
  - Filtra por recomendação
  - Filtra por ticker (busca)
  - Chama `onSelect` ao clicar num item
- `HistoryModal.test.tsx`:
  - Não renderiza quando `jobId === null`
  - Exibe skeleton enquanto carrega
  - Fecha ao pressionar ESC

---

## Fora do escopo desta iteração

- Deleção de análises do histórico
- Paginação (MVP tem volume baixo; scroll simples suficiente)
- Export / share de análises salvas
- Sincronização em tempo real do drawer durante análise em andamento
