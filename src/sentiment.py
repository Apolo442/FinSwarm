from __future__ import annotations
import hashlib, json
from datetime import timedelta
from src.cache import get_or_fetch
from src.llm.client import LLMClient
from src.llm.routing import ROUTING_TABLE

_PROMPT = (
    "Classifique cada manchete como POS (positivo para a ação), "
    "NEG (negativo) ou NEU (neutro). Responda APENAS um array JSON "
    'de mesma ordem e tamanho. Exemplo: ["POS","NEU","NEG"].\n\nManchetes:\n'
)


async def classify_titles(titles: list[str]) -> list[str]:
    if not titles:
        return []

    keys = [f"sentiment:{hashlib.md5(t.encode()).hexdigest()}" for t in titles]
    cached: list[str | None] = []
    for key in keys:
        try:
            v = await get_or_fetch(key, timedelta(days=3650), lambda: None)
        except Exception:
            v = None
        cached.append(v if v in ("POS", "NEG", "NEU") else None)

    pending_idx = [i for i, v in enumerate(cached) if v is None]
    if pending_idx:
        pending_titles = [titles[i] for i in pending_idx]
        prompt = _PROMPT + "\n".join(f"{i+1}. {t}" for i, t in enumerate(pending_titles))
        client = LLMClient()
        model = ROUTING_TABLE.get("sentiment", {}).get("primary", "z-ai/glm-4.5-air:free")
        messages = [{"role": "user", "content": prompt}]
        raw = await client.complete(messages=messages, model=model)
        try:
            text = raw.strip()
            # Strip markdown code fences if present
            if "```" in text:
                text = text.split("```")[1].strip().lstrip("json").strip()
            labels = json.loads(text)
        except Exception:
            labels = ["NEU"] * len(pending_titles)
        for i, lab in zip(pending_idx, labels):
            if lab not in ("POS", "NEG", "NEU"):
                lab = "NEU"
            cached[i] = lab
            try:
                await get_or_fetch(
                    f"sentiment:{hashlib.md5(titles[i].encode()).hexdigest()}",
                    timedelta(days=3650),
                    lambda lab=lab: lab,
                )
            except Exception:
                pass
    return [v or "NEU" for v in cached]
