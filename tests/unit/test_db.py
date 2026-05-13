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
