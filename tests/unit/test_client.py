import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.llm.client import LLMClient


@pytest.fixture
def client():
    with patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}):
        return LLMClient()


@pytest.mark.asyncio
async def test_complete_returns_content(client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"signal": "ALTA"}'
    client._client.chat.completions.create = AsyncMock(return_value=mock_response)

    result = await client.complete(
        messages=[{"role": "user", "content": "test"}],
        model="google/gemini-2.5-flash:free",
    )
    assert result == '{"signal": "ALTA"}'


@pytest.mark.asyncio
async def test_complete_uses_cache_on_second_call(client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "cached"
    client._client.chat.completions.create = AsyncMock(return_value=mock_response)

    messages = [{"role": "user", "content": "same prompt"}]
    model = "google/gemini-2.5-flash:free"

    await client.complete(messages=messages, model=model)
    await client.complete(messages=messages, model=model)

    assert client._client.chat.completions.create.call_count == 1


@pytest.mark.asyncio
async def test_complete_with_fallback_on_error(client):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "fallback result"

    calls = 0
    async def side_effect(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise Exception("rate limited")
        return mock_response

    client._client.chat.completions.create = AsyncMock(side_effect=side_effect)

    result = await client.complete_with_routing("default", [{"role": "user", "content": "test"}])
    assert result == "fallback result"
