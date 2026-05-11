from src.agents.base import BaseAgent


class RiskAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, all_outputs: dict, ticker: str, volatility_pct: float) -> list[dict]:
        summaries = "\n".join(
            f"- {k.capitalize()}: {v.get('summary', 'N/A') if isinstance(v, dict) else str(v)}"
            for k, v in all_outputs.items()
        )
        prompt = f"""Você é um gestor de risco especializado no mercado de capitais brasileiro.

Análises para {ticker}:
{summaries}

Volatilidade histórica 20d: {volatility_pct:.2f}% ao dia

Com base nessas análises, quantifique o risco e retorne APENAS este JSON (sem markdown):
{{
  "risk_score": inteiro de 0 (risco mínimo) a 100 (risco máximo),
  "stop_loss_pct": float percentual abaixo do preço atual para stop-loss (ex: 8.5 para 8.5%),
  "max_exposure_pct": float percentual máximo do portfólio a alocar (ex: 5.0 para 5%),
  "risk_label": "MUITO_BAIXO" ou "BAIXO" ou "MODERADO" ou "ALTO" ou "MUITO_ALTO",
  "main_risks": ["risco 1", "risco 2"],
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
