from __future__ import annotations
import pandas as pd
import numpy as np


def sma(close: pd.Series, period: int) -> pd.Series:
    return close.rolling(period).mean()


def ema(close: pd.Series, period: int) -> pd.Series:
    return close.ewm(span=period, adjust=False).mean()


def wma(close: pd.Series, period: int) -> pd.Series:
    weights = np.arange(1, period + 1)
    return close.rolling(period).apply(lambda w: np.dot(w, weights) / weights.sum(), raw=True)


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = (-delta.clip(upper=0)).abs()

    # Wilder's smoothing
    avg_gain = gain.ewm(span=period, adjust=False).mean()
    avg_loss = loss.ewm(span=period, adjust=False).mean()

    # Avoid division by zero
    avg_loss = avg_loss.replace(0, np.nan)
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    line = ema(close, fast) - ema(close, slow)
    sig = ema(line, signal)
    hist = line - sig
    return line, sig, hist


def stoch(high: pd.Series, low: pd.Series, close: pd.Series, k: int = 14, d: int = 3):
    hh = high.rolling(k).max()
    ll = low.rolling(k).min()
    pk = 100 * (close - ll) / (hh - ll).replace(0, np.nan)
    pd_ = pk.rolling(d).mean()
    return pk, pd_


def cci(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20) -> pd.Series:
    tp = (high + low + close) / 3
    mean = tp.rolling(period).mean()
    md = (tp - mean).abs().rolling(period).mean()
    return (tp - mean) / (0.015 * md.replace(0, np.nan))


def williams_r(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    hh = high.rolling(period).max()
    ll = low.rolling(period).min()
    return -100 * (hh - close) / (hh - ll).replace(0, np.nan)


def roc(close: pd.Series, period: int = 12) -> pd.Series:
    return ((close - close.shift(period)) / close.shift(period)) * 100


def awesome_oscillator(high: pd.Series, low: pd.Series) -> pd.Series:
    mp = (high + low) / 2
    return sma(mp, 5) - sma(mp, 34)


def classic_pivots(high: float, low: float, close: float) -> dict:
    p = (high + low + close) / 3
    return {
        "method": "classic", "p": round(p, 2),
        "r1": round(2*p - low, 2),  "s1": round(2*p - high, 2),
        "r2": round(p + (high - low), 2), "s2": round(p - (high - low), 2),
        "r3": round(high + 2*(p - low), 2), "s3": round(low - 2*(high - p), 2),
    }


def fibonacci_pivots(high: float, low: float, close: float) -> dict:
    p = (high + low + close) / 3
    rng = high - low
    return {
        "method": "fibonacci", "p": round(p, 2),
        "r1": round(p + 0.382 * rng, 2), "s1": round(p - 0.382 * rng, 2),
        "r2": round(p + 0.618 * rng, 2), "s2": round(p - 0.618 * rng, 2),
        "r3": round(p + 1.0   * rng, 2), "s3": round(p - 1.0   * rng, 2),
    }


def camarilla_pivots(high: float, low: float, close: float) -> dict:
    rng = high - low
    return {
        "method": "camarilla", "p": round(close, 2),
        "r1": round(close + rng * 1.1/12, 2), "s1": round(close - rng * 1.1/12, 2),
        "r2": round(close + rng * 1.1/6, 2),  "s2": round(close - rng * 1.1/6, 2),
        "r3": round(close + rng * 1.1/4, 2),  "s3": round(close - rng * 1.1/4, 2),
    }


def woodie_pivots(high: float, low: float, close: float) -> dict:
    p = (high + low + 2*close) / 4
    return {
        "method": "woodie", "p": round(p, 2),
        "r1": round(2*p - low, 2), "s1": round(2*p - high, 2),
        "r2": round(p + (high - low), 2), "s2": round(p - (high - low), 2),
        "r3": round(high + 2*(p - low), 2), "s3": round(low - 2*(high - p), 2),
    }


def demark_pivots(open_: float, high: float, low: float, close: float) -> dict:
    if close < open_:   x = high + 2*low + close
    elif close > open_: x = 2*high + low + close
    else:               x = high + low + 2*close
    p = x / 4
    return {
        "method": "demark", "p": round(p, 2),
        "r1": round(x/2 - low, 2), "s1": round(x/2 - high, 2),
        "r2": None, "s2": None, "r3": None, "s3": None,
    }


def _signal_for_rsi(v: float) -> str:
    if v < 30: return "BUY"
    if v > 70: return "SELL"
    return "NEUTRAL"

def _signal_for_macd(line: float, sig: float) -> str:
    if line > sig + 0.1: return "BUY"
    if line < sig - 0.1: return "SELL"
    return "NEUTRAL"

def _signal_for_ma(price: float, ma: float) -> str:
    diff = (price - ma) / ma if ma else 0
    if diff > 0.01: return "BUY"
    if diff < -0.01: return "SELL"
    return "NEUTRAL"


def compute_signals(df: pd.DataFrame) -> dict:
    """df precisa de colunas Open, High, Low, Close, Volume."""
    close = df["Close"]; high = df["High"]; low = df["Low"]; open_ = df["Open"]

    rsi_v = float(rsi(close, 14).iloc[-1])
    line, sig, _ = macd(close)
    macd_l = float(line.iloc[-1]); macd_s = float(sig.iloc[-1])
    pk, pd_ = stoch(high, low, close)
    stoch_v = float(pk.iloc[-1])
    cci_v = float(cci(high, low, close).iloc[-1])
    wr_v  = float(williams_r(high, low, close).iloc[-1])
    roc_v = float(roc(close).iloc[-1])
    ao_v  = float(awesome_oscillator(high, low).iloc[-1])

    price = float(close.iloc[-1])
    mas = {
        "SMA (5)":   float(sma(close, 5).iloc[-1]),
        "SMA (10)":  float(sma(close, 10).iloc[-1]),
        "SMA (20)":  float(sma(close, 20).iloc[-1]),
        "SMA (50)":  float(sma(close, 50).iloc[-1]),
        "SMA (200)": float(sma(close, 200).iloc[-1]) if len(close) >= 200 else float("nan"),
        "EMA (20)":  float(ema(close, 20).iloc[-1]),
        "EMA (50)":  float(ema(close, 50).iloc[-1]),
        "WMA (20)":  float(wma(close, 20).iloc[-1]),
    }

    oscillators = [
        {"name": "RSI (14)",       "value": round(rsi_v, 2), "signal": _signal_for_rsi(rsi_v)},
        {"name": "MACD (12,26)",   "value": round(macd_l, 2), "signal": _signal_for_macd(macd_l, macd_s)},
        {"name": "Stochastic %K",  "value": round(stoch_v, 1),
         "signal": "BUY" if stoch_v < 20 else "SELL" if stoch_v > 80 else "NEUTRAL"},
        {"name": "CCI (20)",       "value": round(cci_v, 1),
         "signal": "BUY" if cci_v < -100 else "SELL" if cci_v > 100 else "NEUTRAL"},
        {"name": "Williams %R",    "value": round(wr_v, 1),
         "signal": "BUY" if wr_v < -80 else "SELL" if wr_v > -20 else "NEUTRAL"},
        {"name": "ROC",            "value": round(roc_v, 2),
         "signal": "BUY" if roc_v > 1 else "SELL" if roc_v < -1 else "NEUTRAL"},
        {"name": "Awesome Osc.",   "value": round(ao_v, 2),
         "signal": "BUY" if ao_v > 0 else "SELL" if ao_v < 0 else "NEUTRAL"},
    ]
    moving_averages = [
        {"name": name, "value": round(v, 2) if not pd.isna(v) else None,
         "signal": _signal_for_ma(price, v) if not pd.isna(v) else "NEUTRAL"}
        for name, v in mas.items()
    ]

    counts = {"BUY": 0, "SELL": 0, "NEUTRAL": 0}
    for x in oscillators + moving_averages:
        counts[x["signal"]] += 1
    total = sum(counts.values())
    buy_pct = counts["BUY"] / total
    sell_pct = counts["SELL"] / total
    if   sell_pct >= 0.7: summary_signal = "STRONG_SELL"
    elif sell_pct >= 0.5: summary_signal = "SELL"
    elif buy_pct  >= 0.7: summary_signal = "STRONG_BUY"
    elif buy_pct  >= 0.5: summary_signal = "BUY"
    else:                 summary_signal = "NEUTRAL"

    prev = df.iloc[-2]
    pivots = [
        classic_pivots(float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
        fibonacci_pivots(float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
        camarilla_pivots(float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
        woodie_pivots(float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
        demark_pivots(float(prev["Open"]), float(prev["High"]), float(prev["Low"]), float(prev["Close"])),
    ]

    return {
        "summary": {"signal": summary_signal, "today": summary_signal,
                    "week": summary_signal, "month": summary_signal,
                    "counts": counts},
        "oscillators": oscillators,
        "moving_averages": moving_averages,
        "pivots": pivots,
    }
