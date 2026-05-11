from src.agents.base import BaseAgent


class SynthesisAgent(BaseAgent):
    routing_key = "synthesis"

    def build_messages(self, all_outputs: dict, ticker: str) -> list[dict]:
        sections = []
        for key, data in all_outputs.items():
            if not isinstance(data, dict):
                continue
            summary = data.get("summary", "N/A")
            sections.append(f"### {key.capitalize()}\n{summary}")
        analysis_block = "\n\n".join(sections)

        prompt = f"""Você é um gestor de portfólio sênior especializado no mercado brasileiro.

Síntese das análises para {ticker}:

{analysis_block}

Com base em todas essas análises, produza o relatório final e retorne APENAS este JSON (sem markdown externo):
{{
  "recommendation": "COMPRAR" ou "MANTER" ou "VENDER",
  "confidence": float entre 0.0 e 1.0,
  "reasoning": "parágrafo explicando a decisão com os principais fatores",
  "markdown": "relatório completo em Markdown com seções: Resumo, Análise Técnica, Fundamentalista, Sentimento, Debate Bull/Bear, Risco, Recomendação Final",
  "summary": "1 frase com recomendação, confiança e stop-loss em português de mercado"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
