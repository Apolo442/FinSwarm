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


def _is_numeric(text: str) -> bool:
    cleaned = text.strip().replace(".", "").replace(",", ".").replace("%", "").replace("-", "")
    return bool(cleaned) and cleaned.replace(".", "").isdigit()


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
        texts = [c.get_text(strip=True) for c in cells]
        # percorre pares label/valor: labels começam com '?' no Fundamentus
        i = 0
        while i < len(texts) - 1:
            label_raw = texts[i]
            value_raw = texts[i + 1]
            if label_raw.startswith("?"):
                label = label_raw[1:]  # remove o '?'
                if label and not label_raw[1:2].isdigit():
                    data[label] = _parse_value(value_raw)
                i += 2
            else:
                i += 1

    roe_raw = data.get("ROE", 0.0)
    # EBIT margin: bancos usam Marg. Líquida (não têm EBIT)
    margem_raw = data.get("Marg. EBIT") or data.get("Marg. Líquida") or 0.0
    # Dívida: bancos usam Dív Líq / Patrim quando Dív. Bruta/PL não está disponível
    divida_raw = data.get("Dív. Bruta/PL") or data.get("Dív Líq / Patrim") or 0.0

    return FundamentusData(
        ticker=ticker_clean,
        pl=data.get("P/L", 0.0),
        pvp=data.get("P/VP", 0.0),
        roe=roe_raw / 100 if roe_raw > 1 else roe_raw,
        divida_bruta_pl=divida_raw,
        margem_ebit=margem_raw / 100 if abs(margem_raw) > 1 else margem_raw,
        raw=data,
    )
