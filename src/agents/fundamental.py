from src.agents.base import BaseAgent
from src.data.fundamentus import FundamentusData


class FundamentalAgent(BaseAgent):
    routing_key = "default"
    _last_fundamentals: FundamentusData | None = None

    def build_messages(self, fundamentals: FundamentusData) -> list[dict]:
        self._last_fundamentals = fundamentals
        prompt = f"""Você é um analista fundamentalista especializado no mercado brasileiro.

Dados fundamentalistas de {fundamentals.ticker}:
- P/L: {fundamentals.pl:.2f}
- P/VP: {fundamentals.pvp:.2f}
- ROE: {fundamentals.roe * 100:.1f}%
- Dívida Bruta/PL: {fundamentals.divida_bruta_pl:.2f}
- Margem EBIT: {fundamentals.margem_ebit * 100:.1f}%

Analise e retorne APENAS este JSON (sem markdown):
{{
  "health": "EXCELENTE" ou "BOA" ou "REGULAR" ou "RUIM",
  "valuation": "BARATO" ou "JUSTO" ou "CARO",
  "roe_interpretation": "string",
  "debt_risk": "BAIXO" ou "MODERADO" ou "ALTO",
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        result = self._extract_json(content)
        if self._last_fundamentals is not None:
            f = self._last_fundamentals
            result["_metrics"] = {
                "pl":               round(f.pl, 2),
                "pvp":              round(f.pvp, 2),
                "roe_pct":          round(f.roe * 100, 1),
                "divida_bruta_pl":  round(f.divida_bruta_pl, 2),
                "margem_ebit_pct":  round(f.margem_ebit * 100, 1),
            }
        return result
