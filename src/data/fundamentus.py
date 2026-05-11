from __future__ import annotations
from dataclasses import dataclass, field
import requests
from bs4 import BeautifulSoup


@dataclass
class FundamentusData:
    ticker: str
    pl: float = 0.0
    pvp: float = 0.0
    roe: float = 0.0
    divida_bruta_pl: float = 0.0
    margem_ebit: float = 0.0
    raw: dict = field(default_factory=dict)


def _parse_value(text: str) -> float:
    text = text.strip().replace(".", "").replace(",", ".").replace("%", "")
    try:
        return float(text)
    except ValueError:
        return 0.0


def fetch_fundamentus(ticker: str) -> FundamentusData:
    ticker_clean = ticker.replace(".SA", "").upper()
    url = f"https://www.fundamentus.com.br/detalhes.php?papel={ticker_clean}"
    headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"}
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    data: dict[str, float] = {}

    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        for i in range(len(cells) - 1):
            label_span = cells[i].find("span")
            value_span = cells[i + 1].find("span")
            if label_span and value_span:
                label = label_span.get_text(strip=True)
                value = _parse_value(value_span.get_text(strip=True))
                data[label] = value

    roe_raw = data.get("ROE", 0.0)
    margem_raw = data.get("Marg. EBIT", 0.0)

    return FundamentusData(
        ticker=ticker_clean,
        pl=data.get("P/L", 0.0),
        pvp=data.get("P/VP", 0.0),
        roe=roe_raw / 100 if roe_raw > 1 else roe_raw,
        divida_bruta_pl=data.get("Dív. Bruta/PL", 0.0),
        margem_ebit=margem_raw / 100 if margem_raw > 1 else margem_raw,
        raw=data,
    )
