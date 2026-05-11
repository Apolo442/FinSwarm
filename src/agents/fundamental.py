from src.agents.base import BaseAgent
from src.data.fundamentus import FundamentusData


class FundamentalAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, fundamentals: FundamentusData) -> list[dict]:
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
        return self._extract_json(content)
