from __future__ import annotations
import asyncio
import json
import os
from openai import AsyncOpenAI
from src.llm.cache import TTLCache
from src.llm.routing import get_route


class LLMClient:
    _semaphore: asyncio.Semaphore | None = None

    @classmethod
    def _get_semaphore(cls) -> asyncio.Semaphore:
        if cls._semaphore is None:
            cls._semaphore = asyncio.Semaphore(1)
        return cls._semaphore

    def __init__(self):
        self._client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ["OPENROUTER_API_KEY"],
        )
        self._cache = TTLCache(ttl_seconds=3600)

    async def complete(self, messages: list[dict], model: str) -> str:
        prompt_text = json.dumps(messages)
        cache_key = self._cache.make_key(prompt_text, model)
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        async with self._get_semaphore():
            response = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.2,
            )
        content = response.choices[0].message.content or ""
        self._cache.set(cache_key, content)
        return content

    async def complete_with_routing(self, routing_key: str, messages: list[dict]) -> str:
        route = get_route(routing_key)
        backoff = route.get("backoff", [35.0, 35.0, 35.0])

        for attempt, delay in enumerate(backoff):
            model = route["primary"] if attempt == 0 else route.get("fallback", route["primary"])
            if model is None:
                raise RuntimeError(f"Sem fallback disponível para routing_key={routing_key}")
            try:
                return await self.complete(messages=messages, model=model)
            except Exception as exc:
                if attempt == len(backoff) - 1:
                    raise
                wait = _parse_retry_after(exc) or delay
                await asyncio.sleep(wait)

        raise RuntimeError("Esgotadas todas as tentativas do LLM client")


def _parse_retry_after(exc: Exception) -> float | None:
    try:
        body = exc.body if hasattr(exc, "body") else {}
        return float(body["error"]["metadata"]["retry_after_seconds"])
    except Exception:
        return None
