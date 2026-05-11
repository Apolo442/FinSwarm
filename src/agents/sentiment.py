from src.agents.base import BaseAgent
from src.data.news import NewsData


class SentimentAgent(BaseAgent):
    routing_key = "sentiment"

    def build_messages(self, news: NewsData) -> list[dict]:
        if news.headlines:
            headlines_text = "\n".join(f"- {h}" for h in news.headlines)
        else:
            headlines_text = "Nenhuma notícia encontrada nos últimos 7 dias."

        prompt = f"""Você é um analista de sentimento de mercado especializado no Brasil.

Notícias dos últimos 7 dias sobre {news.ticker}:
{headlines_text}

Analise o sentimento e retorne APENAS este JSON (sem markdown):
{{
  "score": float entre -1.0 (muito negativo) e 1.0 (muito positivo),
  "label": "MUITO_POSITIVO" ou "POSITIVO" ou "NEUTRO" ou "NEGATIVO" ou "MUITO_NEGATIVO",
  "catalysts": ["lista de catalisadores positivos identificados"],
  "risks": ["lista de riscos ou eventos negativos identificados"],
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
