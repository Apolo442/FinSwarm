# Demo Video FinSwarm — Contexto para retomar

## O que queremos fazer

Criar um **vídeo demo profissional do FinSwarm** usando **Claude Design** (claude.ai/design → Prototype).

O fluxo completo está documentado em:
```
~/finswarm/tutorial-demo.md
```
Leia esse arquivo antes de qualquer coisa — é um tutorial completo com todas as etapas, prompts, ferramentas e custos.

---

## Contexto do projeto

O FinSwarm é uma plataforma de análise de ações B3 com:
- **Home** — grid de 20 ações + TickerInput
- **StockDetail** — 5 abas: Visão geral, Finanças, Notícias, Sinais técnicos, Sazonais
- **FinancialsPanel** — 6 subtabs com dados reais (Demonstrações, Dividendos, Rentabilidade...)
- **Análise com 7 agentes IA** — resultado em bento grid (AgentBento)
- **ReportHero** — layout Magazine com PriceChart
- Design system: **Solar Flare palette** (#ffa16c laranja, #479ffa azul)

STATUS completo do projeto: `~/finswarm/docs/STATUS.md`
Design system: `~/finswarm/docs/design/style.md`

---

## O que falta fazer antes de usar o Claude Design

### 1. Tirar screenshots da app rodando

Rodar a app localmente:
```bash
# Terminal 1
cd ~/finswarm && poetry run uvicorn src.api:app --port 8000 --ws wsproto

# Terminal 2
cd ~/finswarm/web && npm run dev
# abre em http://localhost:5173
```

Capturar **8-10 screenshots** em F11 fullscreen (Zoom 100%), com dados reais:

| # | Tela | Detalhe |
|---|---|---|
| 1 | Home Hero | TickerInput + topo do grid de ações |
| 2 | Home Grid | Grid completo com 20 ações |
| 3 | StockDetail Overview | Cotação ao vivo + PriceChart + stats |
| 4 | FinancialsPanel | Qualquer subtab com dados preenchidos |
| 5 | Sinais Técnicos | Tab técnica com RSI, MACD, suporte/resistência |
| 6 | AgentBento | Resultado da análise com 7 agentes |
| 7 | ReportHero | Layout Magazine com gráfico e resumo |
| 8 | Notícias ou Sazonais | Qualquer uma das abas restantes |

Salvar em pasta: `~/finswarm-screenshots/` com nomes como `01-home-hero.png`, etc.

### 2. Montar o prompt para Claude Design

Com screenshots em mãos, abrir **claude.ai/design → Prototype** e usar o template do tutorial com:
- Features principais do FinSwarm
- Design system Solar Flare (cores, dark mode)
- Duração: ~60 segundos
- Narrativa: Problema → Solução (7 agentes) → Resultado → CTA
- Screenshots anexadas

---

## Fluxo resumido (do tutorial)

1. **Screenshots** → 10 min
2. **Gerar animação no Claude Design** → 5 min
3. **Gravar tela** com QuickTime (Mac) ou OBS (Linux) → 5 min
4. **Script com Gemini** (upload do vídeo gravado, pede timestamp por cena) → 5 min
5. **Voiceover com Eleven Labs** → 10 min
6. **Música royalty-free** (Uppbeat.io ou YouTube Audio Library) → 5 min
7. **Editar e exportar** com DaVinci Resolve ou CapCut → 15 min

**Total: ~1 hora**
