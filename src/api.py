from __future__ import annotations
import asyncio
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import field_validator

from src.llm.client import LLMClient
from src.models import AnalysisRequest, AnalysisResult, JobStatus, WsEvent
from src.orchestrator import run_analysis

load_dotenv()

app = FastAPI(title="FinSwarm", version="0.1.0")

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
