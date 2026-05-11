from __future__ import annotations
import json
import logging
from abc import ABC, abstractmethod
from src.llm.client import LLMClient
from src.models import AgentOutput

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    routing_key: str = "default"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    @abstractmethod
    def build_messages(self, **kwargs) -> list[dict]:
        ...

    @abstractmethod
    def parse_output(self, content: str) -> dict:
        ...

    async def run(self, **kwargs) -> AgentOutput:
        messages = self.build_messages(**kwargs)
        try:
            content = await self.llm.complete_with_routing(self.routing_key, messages)
            raw = self.parse_output(content)
            summary = raw.get("summary", content[:200])
            return AgentOutput(status="ok", summary=summary, raw=raw)
        except Exception as exc:
            logger.warning("Agente %s falhou: %s", self.__class__.__name__, exc)
            return AgentOutput(status="failed", summary=str(exc), raw={})

    def _extract_json(self, content: str) -> dict:
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"summary": content}
