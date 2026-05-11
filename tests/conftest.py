import pytest
from unittest.mock import AsyncMock


@pytest.fixture
def mock_llm(mocker):
    from src.llm.client import LLMClient

    client = mocker.MagicMock(spec=LLMClient)
    client.complete_with_routing = AsyncMock()
    return client
