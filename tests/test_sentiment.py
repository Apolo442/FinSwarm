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
