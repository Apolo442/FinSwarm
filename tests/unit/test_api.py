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
