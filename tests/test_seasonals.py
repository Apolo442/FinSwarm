import pandas as pd
import numpy as np
from src.seasonals import compute_seasonals


def test_compute_seasonals_returns_12_months():
    dates = pd.date_range("2021-01-01", "2025-12-31", freq="ME")
    np.random.seed(0)
    df = pd.DataFrame({"Close": np.random.uniform(20, 30, len(dates))}, index=dates)
    out = compute_seasonals(df)
    assert len(out["monthly_avg_5y"]) == 12
    assert all(1 <= m["month"] <= 12 for m in out["monthly_avg_5y"])
    assert all("avg_return_pct" in m for m in out["monthly_avg_5y"])
    assert len(out["years"]) >= 1
