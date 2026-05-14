from __future__ import annotations
import pandas as pd


def compute_seasonals(monthly_df: pd.DataFrame) -> dict:
    """monthly_df: DataFrame indexado por data, com coluna 'Close'."""
    s = monthly_df.copy()
    s.index = pd.to_datetime(s.index)
    s["return_pct"] = s["Close"].pct_change() * 100
    s["month"] = s.index.month
    s["year"] = s.index.year

    monthly_avg = (
        s.groupby("month")["return_pct"].mean().round(2)
         .reset_index().rename(columns={"return_pct": "avg_return_pct"})
    )
    years = []
    for year, grp in s.groupby("year"):
        data = grp[["month", "return_pct"]].dropna().to_dict(orient="records")
        for d in data:
            d["return_pct"] = round(d["return_pct"], 2)
        years.append({"year": int(year), "data": data})

    return {
        "monthly_avg_5y": monthly_avg.to_dict(orient="records"),
        "years": years,
    }
