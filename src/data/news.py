from __future__ import annotations
import os
from dataclasses import dataclass, field
import httpx


@dataclass
class NewsData:
    ticker: str
    headlines: list[str] = field(default_factory=list)


async def fetch_news(ticker: str, company_name: str) -> NewsData:
    api_key = os.environ.get("GNEWS_API_KEY", "")
    if not api_key:
        return NewsData(ticker=ticker)

    query = f"{company_name} OR {ticker.replace('.SA', '')}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://gnews.io/api/v4/search",
                params={
                    "q": query,
                    "lang": "pt",
                    "country": "br",
                    "max": 10,
                    "from": _days_ago(7),
                    "apikey": api_key,
                },
            )
            if resp.status_code != 200:
                return NewsData(ticker=ticker)
            articles = resp.json().get("articles", [])
            return NewsData(
                ticker=ticker,
                headlines=[a["title"] for a in articles if a.get("title")],
            )
    except Exception:
        return NewsData(ticker=ticker)


def _days_ago(days: int) -> str:
    from datetime import datetime, timedelta, timezone
    dt = datetime.now(timezone.utc) - timedelta(days=days)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
