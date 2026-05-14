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
    return df


async def _fetch_financials(ticker: str) -> dict:
    def f():
        try:
            t = yf.Ticker(ticker)
            fin = t.financials
            div = t.dividends
            return {
                "revenue_by_year": {str(c.year): float(fin.loc["Total Revenue", c])
                                    for c in fin.columns if "Total Revenue" in fin.index} if not fin.empty else {},
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
                "summary": info.get("longBusinessSummary"),
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
            "news_preview": [],
            "technicals_summary": signals["summary"] if signals else {
                "signal": "NEUTRAL", "today": "NEUTRAL", "week": "NEUTRAL", "month": "NEUTRAL", "counts": {}
            },
            "forecast_summary": {
                "target_mean": None, "target_high": None, "target_low": None,
                "target_median": None, "current": price, "recommendations": {},
            },
        }
    return await get_or_fetch(f"overview:{ticker}", timedelta(minutes=10), build)
