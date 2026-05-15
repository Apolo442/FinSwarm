from src.agents.base import BaseAgent
from src.data.market import MarketData


class TechnicalAgent(BaseAgent):
    routing_key = "default"

    def build_messages(self, market_data: MarketData) -> list[dict]:
        prompt = f"""Você é um analista técnico especializado no mercado de capitais brasileiro.

Dados técnicos de {market_data.ticker} ({market_data.name}):
- Preço atual: R$ {market_data.price:.2f}
- Variação 20 dias: {market_data.pct_20d:+.1f}%
- Volume médio 20d: {market_data.volume_avg_20d:,.0f}
- RSI (14): {market_data.rsi:.2f}
- MACD: {market_data.macd:.4f} | Signal: {market_data.macd_signal:.4f} | Hist: {market_data.macd_hist:.4f}
- Bollinger Superior: {market_data.bb_upper:.2f} | Média: {market_data.bb_mid:.2f} | Inferior: {market_data.bb_lower:.2f}

Analise e retorne APENAS este JSON (sem markdown):
{{
  "signal": "ALTA" ou "BAIXA" ou "NEUTRO",
  "current_price": {market_data.price:.2f},
  "rsi": {market_data.rsi:.2f},
  "macd_line": {market_data.macd:.4f},
  "macd_signal_line": {market_data.macd_signal:.4f},
  "macd_hist": {market_data.macd_hist:.4f},
  "rsi_interpretation": "string explicando o RSI",
  "macd_interpretation": "string explicando MACD",
  "bollinger_position": "ACIMA_SUPERIOR" ou "ENTRE_BANDAS" ou "ABAIXO_INFERIOR",
  "support_level": float,
  "resistance_level": float,
  "summary": "2-3 frases em português de mercado financeiro"
}}"""
        return [{"role": "user", "content": prompt}]

    def parse_output(self, content: str) -> dict:
        return self._extract_json(content)
