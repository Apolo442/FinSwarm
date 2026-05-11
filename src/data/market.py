from __future__ import annotations
from dataclasses import dataclass
import yfinance as yf
import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import MACD
from ta.volatility import BollingerBands


@dataclass
class MarketData:
    ticker: str
    price: float
    pct_20d: float
    volume_avg_20d: float
    rsi: float
    macd: float
    macd_signal: float
    macd_hist: float
    bb_upper: float
    bb_mid: float
    bb_lower: float
    name: str
    sector: str


def fetch_market_data(ticker: str) -> MarketData:
    t = yf.Ticker(ticker)
    hist = t.history(period="200d")
    info = t.info or {}

    close = hist["Close"]
    volume = hist["Volume"]

    rsi = RSIIndicator(close=close, window=14).rsi().iloc[-1]
    macd_ind = MACD(close=close)
    bb = BollingerBands(close=close, window=20, window_dev=2)

    return MarketData(
        ticker=ticker,
        price=float(close.iloc[-1]),
        pct_20d=float((close.iloc[-1] / close.iloc[-20] - 1) * 100),
        volume_avg_20d=float(volume.iloc[-20:].mean()),
        rsi=float(rsi),
        macd=float(macd_ind.macd().iloc[-1]),
        macd_signal=float(macd_ind.macd_signal().iloc[-1]),
        macd_hist=float(macd_ind.macd_diff().iloc[-1]),
        bb_upper=float(bb.bollinger_hband().iloc[-1]),
        bb_mid=float(bb.bollinger_mavg().iloc[-1]),
        bb_lower=float(bb.bollinger_lband().iloc[-1]),
        name=info.get("shortName", ticker),
        sector=info.get("sector", "N/A"),
    )
