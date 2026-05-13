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
