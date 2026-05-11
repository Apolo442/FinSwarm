import pytest
from unittest.mock import AsyncMock
from src.llm.client import LLMClient


@pytest.fixture
def mock_llm(mocker):
    client = mocker.MagicMock(spec=LLMClient)
    client.complete_with_routing = AsyncMock()
    return client
