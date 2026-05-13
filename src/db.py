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
