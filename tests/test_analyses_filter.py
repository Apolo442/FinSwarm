from fastapi.testclient import TestClient
from src.api import app


def test_analyses_filter_by_ticker(tmp_path, monkeypatch):
    monkeypatch.setattr("src.db.DB_PATH", tmp_path / "analyses.db")
    with TestClient(app) as client:
        r = client.get("/analyses?ticker=PETR4")
    assert r.status_code == 200
