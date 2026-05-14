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
