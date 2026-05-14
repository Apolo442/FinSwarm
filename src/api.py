from __future__ import annotations
import asyncio
import logging
from contextlib import asynccontextmanager
from uuid import uuid4

import yfinance as yf

_log = logging.getLogger(__name__)

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
        try:
            await save_analysis(result)
        except Exception as db_exc:
            _log.error("save_analysis failed for job %s: %s", job_id, db_exc)
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


@app.get("/chart/{ticker}")
async def get_chart(ticker: str, period: str = "3mo", interval: str = "1d"):
    t = yf.Ticker(ticker)
    hist = t.history(period=period, interval=interval)
    result = []
    for ts, row in hist.iterrows():
        result.append({
            "time":   int(ts.timestamp()),
            "open":   round(float(row["Open"]),   2),
            "high":   round(float(row["High"]),   2),
            "low":    round(float(row["Low"]),    2),
            "close":  round(float(row["Close"]),  2),
            "volume": int(row["Volume"]),
        })
    return result
