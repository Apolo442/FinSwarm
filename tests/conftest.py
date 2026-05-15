import pytest
from unittest.mock import AsyncMock
from dotenv import load_dotenv

load_dotenv()


@pytest.fixture(autouse=True)
def clear_stock_cache():
    from src.cache import _memory_cache
    _memory_cache.clear()
    yield
    _memory_cache.clear()


@pytest.fixture
def mock_llm(mocker):
    from src.llm.client import LLMClient

    client = mocker.MagicMock(spec=LLMClient)
    client.complete_with_routing = AsyncMock()
    return client
