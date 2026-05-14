import pandas as pd
import numpy as np
from src.technicals import rsi, macd, sma, ema, stoch, cci, williams_r


def fake_close(values):
    return pd.Series(values, dtype=float)


def test_rsi_overbought():
    # Strong uptrend with realistic variation
    # Most candles up, few down -> RSI > 70
    prices = [100, 101, 102, 103, 102.5, 104, 105, 106, 105.5, 107, 108, 109, 110, 111, 112, 111.5, 113, 114, 115, 116]
    s = fake_close(prices)
    val = rsi(s, period=14).iloc[-1]
    assert val > 70


def test_rsi_oversold():
    s = fake_close([20-i*0.5 for i in range(20)])
    val = rsi(s, period=14).iloc[-1]
    assert val < 30


def test_sma_simple():
    s = fake_close([1, 2, 3, 4, 5])
    assert sma(s, 5).iloc[-1] == 3.0


def test_ema_recent_weighted():
    s = fake_close([1.0]*20 + [10.0])
    val = ema(s, 5).iloc[-1]
    assert val > 3.0


def test_macd_signal_line():
    s = fake_close(list(range(50)))
    line, signal, hist = macd(s)
    assert not np.isnan(line.iloc[-1])
    assert not np.isnan(signal.iloc[-1])


from src.technicals import classic_pivots, fibonacci_pivots, camarilla_pivots, compute_signals


def test_classic_pivots():
    p = classic_pivots(high=10, low=8, close=9)
    assert p["p"] == 9.0
    assert p["s1"] == 8.0  # 2P - H
    assert p["r1"] == 10.0  # 2P - L


def test_fibonacci_pivots():
    p = fibonacci_pivots(high=10, low=8, close=9)
    assert p["p"] == 9.0
    assert p["s1"] < p["p"] < p["r1"]


def test_compute_signals_returns_summary():
    np.random.seed(42)
    n = 250
    df = pd.DataFrame({
        "High": np.random.uniform(20, 25, n),
        "Low": np.random.uniform(18, 20, n),
        "Close": np.random.uniform(19, 24, n),
        "Open": np.random.uniform(19, 24, n),
        "Volume": np.random.randint(1000000, 10000000, n),
    })
    out = compute_signals(df)
    assert "summary" in out and "oscillators" in out and "moving_averages" in out and "pivots" in out
    assert out["summary"]["signal"] in ("STRONG_BUY","BUY","NEUTRAL","SELL","STRONG_SELL")
    assert len(out["oscillators"]) >= 5
    assert len(out["moving_averages"]) >= 5
