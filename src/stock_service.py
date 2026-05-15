from __future__ import annotations
import asyncio
from datetime import timedelta
from typing import Any
import yfinance as yf
import pandas as pd
from src.cache import get_or_fetch
from src.technicals import compute_signals
from src.seasonals import compute_seasonals
from src.data.news import fetch_news
from src.sentiment import classify_titles


def _normalize_ticker(t: str) -> str:
    t = t.upper().strip()
    return t if t.endswith(".SA") else f"{t}.SA"


async def _fetch_info(ticker: str) -> dict:
    def f():
        try: return yf.Ticker(ticker).info or {}
        except Exception: return {}
    return await get_or_fetch(f"yf_info:{ticker}", timedelta(hours=6), f)


async def _fetch_fast_info(ticker: str) -> dict:
    def f():
        try:
            fi = yf.Ticker(ticker).fast_info
            return {
                "last_price": float(fi.last_price or 0),
                "previous_close": float(fi.previous_close or 0),
                "last_volume": int(fi.last_volume or 0),
                "market_cap": float(fi.market_cap or 0),
                "currency": fi.currency or "BRL",
            }
        except Exception:
            return {}
    return await get_or_fetch(f"yf_quote:{ticker}", timedelta(seconds=30), f)


async def _fetch_history(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    def f():
        try:
            df = yf.Ticker(ticker).history(period=period, interval=interval)
            return df.reset_index().to_dict(orient="records")
        except Exception:
            return []
    rows = await get_or_fetch(
        f"yf_history:{ticker}:{period}:{interval}", timedelta(hours=1), f
    )
    if not rows: return pd.DataFrame()
    df = pd.DataFrame(rows)
    if "Date" in df.columns:
        df.index = pd.to_datetime(df["Date"]); df = df.drop(columns=["Date"])
    elif "index" in df.columns:
        df.index = pd.to_datetime(df["index"]); df = df.drop(columns=["index"])
    return df


async def _fetch_financials(ticker: str) -> dict:
    def f():
        try:
            t = yf.Ticker(ticker)
            fin = t.financials
            div = t.dividends
            # filtra NaN — bancos não têm "Total Revenue" em todos os anos
            rev: dict[str, float] = {}
            if not fin.empty and "Total Revenue" in fin.index:
                for c in fin.columns:
                    val = fin.loc["Total Revenue", c]
                    if not pd.isna(val):
                        rev[str(c.year)] = float(val)
            return {
                "revenue_by_year": rev,
                "dividends_by_year": {str(d.year): float(v) for d, v in div.items()} if not div.empty else {},
            }
        except Exception:
            return {}
    return await get_or_fetch(f"yf_financials:{ticker}", timedelta(hours=12), f)


async def get_financials(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        fi, info, fin = await asyncio.gather(
            _fetch_fast_info(ticker),
            _fetch_info(ticker),
            _fetch_financials(ticker),
        )
        rev = fin.get("revenue_by_year", {})
        years = sorted(rev.keys())
        growth = [{"year": int(y), "revenue": rev[y]} for y in years]

        div_by_year: dict[str, float] = {}
        for date_str, amount in fin.get("dividends_by_year", {}).items():
            year = date_str[:4] if isinstance(date_str, str) else str(date_str)
            div_by_year[year] = div_by_year.get(year, 0) + amount
        dividends_history = [
            {"year": int(y), "dps": round(v, 2), "dy_pct": None}
            for y, v in sorted(div_by_year.items())
        ]

        return {
            "facts": {
                "mkt_cap": fi.get("market_cap"),
                "div_yield": info.get("dividendYield"),
                "pl_12m": info.get("trailingPE"),
                "eps_12m": info.get("trailingEps"),
                "beta": info.get("beta"),
                "volatility": None,
                "last_quarter_profit": info.get("netIncomeToCommon"),
            },
            "capital_structure": {
                "mkt_cap": fi.get("market_cap"),
                "debt": info.get("totalDebt"),
                "cash": info.get("totalCash"),
                "minority_interest": info.get("minorityInterest"),
                "enterprise_value": info.get("enterpriseValue"),
            },
            "valuation": {
                "pl": info.get("trailingPE"),
                "ps": info.get("priceToSalesTrailing12Months"),
                "pb": info.get("priceToBook"),
                "ev_ebitda": info.get("enterpriseToEbitda"),
                "revenue": info.get("totalRevenue"),
                "net_income": info.get("netIncomeToCommon"),
            },
            "growth": growth,
            "profitability": {
                "roe": info.get("returnOnEquity"),
                "roa": info.get("returnOnAssets"),
                "net_margin": info.get("profitMargins"),
                "ebit_margin": info.get("operatingMargins"),
            },
            "dividends_history": dividends_history,
            "next_dividend": None,
            "financial_health": [],
            "estimates": [],
        }
    return await get_or_fetch(f"financials:{ticker}", timedelta(hours=1), build)


async def _translate_summary(text: str | None) -> str | None:
    if not text:
        return None
    try:
        from src.llm.client import LLMClient
        from src.llm.routing import ROUTING_TABLE
        llm = LLMClient()
        model = ROUTING_TABLE.get("sentiment", {}).get("primary", "z-ai/glm-4.5-air:free")
        result = await llm.complete(
            messages=[{"role": "user", "content":
                f"Traduza o texto abaixo para português brasileiro, mantendo termos técnicos financeiros. "
                f"Retorne SOMENTE o texto traduzido, sem explicações:\n\n{text[:1200]}"}],
            model=model,
        )
        return result.strip() if result else text
    except Exception:
        return text


async def get_overview(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        fi, info, hist1y, hist5y = await asyncio.gather(
            _fetch_fast_info(ticker),
            _fetch_info(ticker),
            _fetch_history(ticker, "1y", "1d"),
            _fetch_history(ticker, "5y", "1mo"),
        )
        price = fi.get("last_price", 0); prev = fi.get("previous_close", 0)
        change = price - prev
        change_pct = (change / prev * 100) if prev else 0

        signals = compute_signals(hist1y) if not hist1y.empty and len(hist1y) >= 20 else None
        seasonal = compute_seasonals(hist5y) if not hist5y.empty else {"monthly_avg_5y": [], "years": []}

        raw_summary = info.get("longBusinessSummary")
        summary_pt = await _translate_summary(raw_summary)

        # Notícias sem classificação LLM para não estourar rate limit
        news_preview: list[dict] = []
        try:
            yf_news = yf.Ticker(ticker).news or []
            for item in yf_news[:4]:
                content = item.get("content", {}) or item
                title = content.get("title")
                if title:
                    news_preview.append({
                        "title": title,
                        "source": content.get("provider", {}).get("displayName", "Yahoo Finance"),
                        "url": content.get("canonicalUrl", {}).get("url"),
                        "published_at": content.get("pubDate"),
                        "summary": content.get("summary"),
                        "sentiment": "NEU",
                        "sentiment_score": 0,
                    })
        except Exception:
            pass

        return {
            "ticker": ticker,
            "quote": {
                "price": round(price, 2), "prev_close": round(prev, 2),
                "change": round(change, 2), "change_pct": round(change_pct, 2),
                "volume": fi.get("last_volume"), "mkt_cap": fi.get("market_cap"),
                "currency": fi.get("currency", "BRL"),
            },
            "profile": {
                "long_name": info.get("longName") or info.get("shortName"),
                "summary": summary_pt,
                "ceo": (info.get("companyOfficers", [{}])[0].get("name")
                        if info.get("companyOfficers") else None),
                "founded": None,
                "employees": info.get("fullTimeEmployees"),
                "website": info.get("website"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
            },
            "kpis": {
                "mkt_cap": fi.get("market_cap"),
                "div_yield": info.get("dividendYield"),
                "pl_12m": info.get("trailingPE"),
                "eps_12m": info.get("trailingEps"),
                "beta": info.get("beta"),
                "volatility": None,
                "last_quarter_profit": info.get("netIncomeToCommon"),
            },
            "last_earnings": None,
            "next_earnings": None,
            "shareholders": {
                "closely_held_pct": info.get("heldPercentInsiders"),
                "free_float_pct": (1 - info.get("heldPercentInsiders", 0)) if info.get("heldPercentInsiders") else None,
                "total_shares": info.get("sharesOutstanding"),
            },
            "seasonals_mini": seasonal.get("monthly_avg_5y", [])[:12],
            "news_preview": news_preview,
            "technicals_summary": signals["summary"] if signals else {
                "signal": "NEUTRAL", "today": "NEUTRAL", "week": "NEUTRAL", "month": "NEUTRAL", "counts": {}
            },
            "forecast_summary": {
                "target_mean": None, "target_high": None, "target_low": None,
                "target_median": None, "current": price, "recommendations": {},
            },
        }
    return await get_or_fetch(f"overview:{ticker}", timedelta(minutes=10), build)


async def get_news(ticker_raw: str, limit: int = 20) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        info = await _fetch_info(ticker)
        company = info.get("shortName") or info.get("longName") or ticker
        news_data = await fetch_news(ticker, company)
        gnews_titles = news_data.headlines[:limit]

        yf_news = []
        try:
            for item in (yf.Ticker(ticker).news or [])[:limit]:
                content = item.get("content", {}) or item
                title = content.get("title")
                if title:
                    yf_news.append({
                        "title": title,
                        "source": content.get("provider", {}).get("displayName", "yfinance"),
                        "url": content.get("canonicalUrl", {}).get("url"),
                        "published_at": content.get("pubDate"),
                        "summary": content.get("summary"),
                    })
        except Exception:
            pass

        seen, items = set(), []
        for t in gnews_titles:
            if t in seen: continue
            seen.add(t)
            items.append({"title": t, "source": "GNews", "url": None,
                          "published_at": None, "summary": None})
        for it in yf_news:
            if it["title"] in seen: continue
            seen.add(it["title"]); items.append(it)
        items = items[:limit]

        labels = await classify_titles([it["title"] for it in items])
        for it, lab in zip(items, labels):
            it["sentiment"] = lab
            it["sentiment_score"] = {"POS": 60, "NEG": -60, "NEU": 0}[lab]

        return {"items": items, "next_cursor": None}
    return await get_or_fetch(f"news:{ticker}", timedelta(minutes=5), build)


async def get_technicals(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        hist = await _fetch_history(ticker, "1y", "1d")
        if hist.empty or len(hist) < 20:
            return {
                "summary": {"signal": "NEUTRAL", "today": "NEUTRAL", "week": "NEUTRAL", "month": "NEUTRAL", "counts": {}},
                "oscillators": [], "moving_averages": [], "pivots": [],
            }
        data = compute_signals(hist)
        # Replace NaN with None for JSON serialization
        def clean_nan(obj):
            if isinstance(obj, dict):
                return {k: clean_nan(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_nan(item) for item in obj]
            elif isinstance(obj, float):
                return None if pd.isna(obj) else obj
            return obj
        return clean_nan(data)
    return await get_or_fetch(f"technicals:{ticker}", timedelta(hours=1), build)


async def _fetch_forecast_raw(ticker: str) -> dict:
    def f():
        try:
            t = yf.Ticker(ticker)
            tgt = t.analyst_price_targets or {}
            try:
                rec = t.recommendations
            except Exception:
                rec = None
            rec_dict = {"strong_buy": 0, "buy": 0, "hold": 0, "sell": 0, "strong_sell": 0}
            if rec is not None and not rec.empty:
                latest = rec.iloc[0]
                rec_dict = {
                    "strong_buy": int(latest.get("strongBuy", 0)),
                    "buy": int(latest.get("buy", 0)),
                    "hold": int(latest.get("hold", 0)),
                    "sell": int(latest.get("sell", 0)),
                    "strong_sell": int(latest.get("strongSell", 0)),
                }
            return {"target": tgt, "recommendations": rec_dict}
        except Exception:
            return {"target": {}, "recommendations": {}}
    return await get_or_fetch(f"yf_forecast:{ticker}", timedelta(hours=12), f)


async def get_forecast(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        fi, fc = await asyncio.gather(
            _fetch_fast_info(ticker),
            _fetch_forecast_raw(ticker),
        )
        tgt = fc.get("target", {})
        return {
            "price_target": {
                "current": fi.get("last_price") or tgt.get("current"),
                "target_mean": tgt.get("mean"),
                "target_high": tgt.get("high"),
                "target_low": tgt.get("low"),
                "target_median": tgt.get("median"),
                "recommendations": fc.get("recommendations", {}),
            },
            "recommendations": fc.get("recommendations", {}),
            "eps_history": [],
            "revenue_history": [],
            "next_eps_estimate": None,
            "next_revenue_estimate": None,
        }
    return await get_or_fetch(f"forecast:{ticker}", timedelta(hours=1), build)


async def get_seasonals(ticker_raw: str) -> dict:
    ticker = _normalize_ticker(ticker_raw)
    async def build():
        hist = await _fetch_history(ticker, "5y", "1mo")
        if hist.empty:
            return {"monthly_avg_5y": [], "years": []}
        return compute_seasonals(hist)
    return await get_or_fetch(f"seasonals:{ticker}", timedelta(hours=24), build)
