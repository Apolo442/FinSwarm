from src.agents.base import BaseAgent


def _format_phase1(outputs: dict) -> str:
    lines = []
    for name, data in outputs.items():
        summary = data.get("summary", "N/A") if isinstance(data, dict) else str(data)
        lines.append(f"- {name.capitalize()}: {summary}")
    return "\n".join(lines)


class BullAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, phase1_outputs: dict, ticker: str) -> list[dict]:
        prompt = f"""Você é um analista otimista (bull) especializado no mercado brasileiro.

Análises recebidas para {ticker}:
{_format_phase1(phase1_outputs)}

Construa a tese de ALTA mais convincente possível com base nessas análises.
Retorne APENAS este JSON (sem markdown):
{{
  "arguments": [
    "argumento 1 específico com dado ou evidência",
    "argumento 2 específico com dado ou evidência",
    "argumento 3 específico com dado ou evidência"
  ],
  "conviction": "MUITO_ALTA" ou "ALTA" ou "MODERADA",
  "summary": "2-3 frases resumindo a tese de alta em português de mercado"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)


class BearAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, phase1_outputs: dict, ticker: str) -> list[dict]:
        prompt = f"""Você é um analista pessimista (bear) especializado no mercado brasileiro.

Análises recebidas para {ticker}:
{_format_phase1(phase1_outputs)}

Construa a tese de BAIXA mais convincente possível com base nessas análises.
Retorne APENAS este JSON (sem markdown):
{{
  "arguments": [
    "argumento 1 específico com dado ou risco",
    "argumento 2 específico com dado ou risco",
    "argumento 3 específico com dado ou risco"
  ],
  "conviction": "MUITO_ALTA" ou "ALTA" ou "MODERADA",
  "summary": "2-3 frases resumindo a tese de baixa em português de mercado"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
