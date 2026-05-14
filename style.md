# FinSwarm — Design System v2 (Dovetail / Solar Command Center)
> Interface de inteligência financeira. Dark, imersiva, glassmórfica. Parece um painel de controle de missão, não um dashboard SaaS.

**Versão ativa:** v2 (Solar Flare palette)
**Substituída:** v1 "Slash / Midnight Ledger" (descontinuada)

---

## Tokens — Cores

| Nome | Valor | Token | Papel |
|------|-------|-------|-------|
| Background | `#131313` | `--color-bg` | Fundo base da aplicação |
| Surface | `#1a1a1a` | `--color-surface` | Superfícies elevadas, cards sólidos |
| Surface Alt | `#1f1f1f` | `--color-surface-alt` | Superfícies secundárias |
| Border | `rgba(255,255,255,0.09)` | `--color-border` | Borda principal de cards glass |
| Border Sub | `rgba(255,255,255,0.06)` | `--color-border-sub` | Bordas internas, separadores |
| Solar Flare | `#ffa16c` | `--color-brand-solar` | Cor de marca / recomendação COMPRAR / síntese |
| Cosmic Blue | `#479ffa` | `--color-accent` | Acento interativo, tickers, links, gráfico |
| Emerald Profit | `#4ebe96` | `--color-positive` | Positivo: comprar, crescimento, profit |
| Warn | `#e9a84a` | `--color-warn` | Alerta: manter, neutro |
| Negative | `#e05454` | `--color-negative` | Negativo: vender, risco, erro |
| Text Primary | `#ffffff` | `--color-text-primary` | Texto principal, métricas de destaque |
| Text Smoke | `#e6e6e6` | `--color-text-smoke` | Títulos H1, headings principais |
| Text Silver | `#cccccc` | `--color-text-silver` | Corpo de texto, descrições |
| Text Ash | `#999999` | `--color-text-ash` | Timestamps, labels secundários |
| Text Slate | `#868f97` | `--color-text-slate` | Metadados, labels apagados, eixos de gráfico |

### Blobs de fundo orgânicos (App.tsx)

| Posição | Cor base | Forma | Opacidade |
|---------|----------|-------|-----------|
| Top-left | Solar Flare `rgba(255,161,108,0.22)` | `62% 38% 54% 46% / 48% 57% 43% 52%` | filtro blur 80px |
| Bottom-right | Slate `rgba(134,143,151,0.20)` | `44% 56% 38% 62% / 57% 38% 62% 43%` | filtro blur 100px |
| Accent center | Solar Flare `rgba(255,161,108,0.08)` | `52% 48% 61% 39% / 46% 55% 45% 54%` | filtro blur 60px |

---

## Tokens — Tipografia

**Fontes:**

- `Inter` — corpo, labels, interface geral (`--font-inter`)
- `JetBrains Mono` — dados, tickers, percentuais, monospace (`--font-mono`)

**Escala de tipo:**

| Token | Tamanho | Uso |
|-------|---------|-----|
| `--text-caption` | 14px | Caption, labels de campo |
| `--text-body` | 16px | Corpo de texto |
| `--text-subheading` | 20px | Subtítulos |
| `--text-heading` | 24px | Títulos de seção |
| `--text-heading-lg` | 40px | Títulos grandes |
| `--text-display` | 56px | Headline principal da Home |

---

## Tokens — Espaçamento & Formas

| Token | Valor |
|-------|-------|
| `--spacing-8` | 8px |
| `--spacing-16` | 16px |
| `--spacing-24` | 24px |
| `--spacing-32` | 32px |
| `--spacing-40` | 40px |
| `--spacing-64` | 64px |
| `--spacing-96` | 96px |
| `--radius-md` | 4px |
| `--radius-lg` | 8px |
| `--radius-full` | 66px |

---

## Classes Utilitárias de Glass

Definidas em `index.css`:

```css
/* Card principal com blur forte */
.glass {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.09);
}

/* Card interno / item de lista */
.glass-inner {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.07);
}

/* Card com acento Cosmic Blue (agente rodando) */
.glass-accent {
  background: rgba(71,159,250,0.06);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(71,159,250,0.18);
}
```

---

## Animações

| Classe | Keyframe | Uso |
|--------|----------|-----|
| `.animate-pulse-blue` | `pulse-blue` 1.6s | Bolinha do agente rodando |
| `.animate-shimmer` | `shimmer` 2.2s | Skeleton de loading |
| `.animate-bar-fill` | `bar-fill` 0.9s | Barras de confiança |
| `.animate-fade-up` | `fade-up` 0.4s | Entrada de cards |

---

## Componentes

### Glass Card

Background `rgba(255,255,255,0.04)`, border 1px `rgba(255,255,255,0.09)`, `backdrop-filter: blur(20px)`. Usar classe `.glass`.

### CompanyLogo

Componente `CompanyLogo.tsx`. Carrega favicon real via Google Favicons (`https://www.google.com/s2/favicons?domain={domain}&sz=64`). Fallback para iniciais em monospace Cosmic Blue caso a imagem falhe ou o domínio seja desconhecido. Container 34×34px, `borderRadius: size * 0.24`, fundo `rgba(71,159,250,0.08)`, borda `rgba(71,159,250,0.16)`.

### StockQuickPicks

Grid 5×2 das 10 principais ações B3. Cada célula: `CompanyLogo` + ticker bold Cosmic Blue + nome da empresa em `#868f97`. Hover: border `rgba(134,143,151,0.4)`, fundo `rgba(134,143,151,0.07)`.

### HistoryDrawer

Painel lateral fixo na Home (coluna direita, `lg:sticky top-8`). Altura `calc(100vh - 96px)`. Header + busca + chips de filtro (cursor pointer, borda Cosmic Blue quando ativo) + lista com `overflow-x: hidden`. Cada item: `CompanyLogo` + ticker + nome truncado + chip de recomendação + data em `shrink-0` + barra de confiança por recomendação (verde/âmbar/vermelho).

### HistoryModal (tela cheia)

Tela full-screen `position: fixed, inset: 0, background: #131313`. Fecha **apenas** pelo botão "← Voltar" no header fixo. Sem ESC, sem click no backdrop. Layout 2 colunas: `gridTemplateColumns: 380px 1fr` — coluna esquerda: `ReportHero` sticky; coluna direita: `AgentBento`. Máx-largura 1400px, `margin: 0 auto`.

### ReportHero (Magazine)

Header da análise concluída. Recomendação em Solar Flare `#ffa16c` grande + ticker separado em `<span>` + timestamp. `PriceChart` integrado com height 160. 3 cards de métrica abaixo: Confiança, Stop Loss, Risco.

### PriceChart

Gráfico TradingView `lightweight-charts` v4 com `AreaSeries`. Linha Cosmic Blue `#479ffa`. Fundo transparente. Seletor de período: 1M / 3M / 6M / 1A. Largura inicial: `Math.max(containerRef.current.offsetWidth, 100)` + `requestAnimationFrame` force-resize para funcionar dentro de modais/containers animados.

### AgentBento

Bento grid 3 colunas, 7 cards visuais:

| Card | Span | Conteúdo |
|------|------|----------|
| TechnicalCard | 2 | RSI arc SVG, barras MACD, faixa S/R |
| SentimentCard | 1 | Gauge semicircular, catalisadores/riscos |
| FundamentalCard | 1 | Chips de saúde/valuation/dívida, barras métricas |
| RiskCard | 2 | Dial circular, stop loss, exposição máxima, tags de risco |
| BullCard | 1 | 🐂 argumentos de alta |
| BearCard | 1 | 🐻 argumentos de baixa |
| SynthesisCard | 3 | Anel de confiança Solar Flare, texto de reasoning |

### AgentSlot (estado ao vivo)

Exibido durante análise em progresso. Barra lateral esquerda: Cosmic Blue `#479ffa` quando rodando, `#e05454` quando falhou. Card com `.glass-accent` + `shadow-[0_0_24px_rgba(71,159,250,0.12)]` no estado running.

### Chips de recomendação

| Recomendação | Cor | Background |
|--------------|-----|------------|
| COMPRAR | `#4ebe96` | `rgba(78,190,150,0.1)`, borda `rgba(78,190,150,0.22)` |
| MANTER | `#e9a84a` | `rgba(233,168,74,0.1)`, borda `rgba(233,168,74,0.2)` |
| VENDER | `#e05454` | `rgba(224,84,84,0.1)`, borda `rgba(224,84,84,0.2)` |

---

## Layout & Composição

**Home:** grid 2 colunas `1fr 300px` (hero+input | HistoryDrawer). Max-width 1216px.

**Analysis ao vivo:** split `40% | 60%` (AgentTimeline | AgentSlots).

**Analysis concluída:** `ReportHero` full-width + `AgentBento` full-width (coluna única).

**HistoryModal:** tela cheia `380px + 1fr` (ReportHero | AgentBento).

---

## Do's e Don'ts

### Do

- Usar `#131313` como fundo base e `#1a1a1a`/`#1f1f1f` para superfícies elevadas.
- Aplicar `.glass` em todos os cards principais, `.glass-inner` em itens de lista.
- Reservar Solar Flare `#ffa16c` para o elemento mais importante da tela (recomendação principal, call-to-action).
- Usar Cosmic Blue `#479ffa` para tudo que é interativo ou dado numérico destacado.
- Usar `JetBrains Mono` para tickers, percentuais, datas e todos os dados financeiros.
- Manter texto de corpo em `#cccccc`/`#e6e6e6` — nunca branco puro para parágrafos.
- Usar `cursor: pointer` explícito em todos os elementos interativos (buttons, chips, cards clicáveis).
- Garantir `shrink-0` em elementos de data/hora para evitar overflow em flex rows.
- Inicializar `PriceChart` com `Math.max(width, 100)` + `requestAnimationFrame` resize.

### Don't

- Não usar branco puro `#ffffff` para texto de corpo ou descrições — reservar para métricas de alto destaque.
- Não fechar modais de página inteira via ESC ou click no backdrop — somente botão "← Voltar" explícito.
- Não usar Solar Flare como cor de fundo sólido — apenas para texto, bordas e fills com baixa opacidade.
- Não acumular múltiplos elementos com glass dentro de outros glass sem aumentar `background` para evitar excesso de blur.
- Não usar `overflow-x: auto` em listas do drawer — usar `overflow-x: hidden`.
- Não criar grids de dashboard simétricos — preferir bento assimétrico (spans variados).

---

## Configuração Tailwind v4 (`@theme`)

```css
@theme {
  --color-bg:           #131313;
  --color-surface:      #1a1a1a;
  --color-surface-alt:  #1f1f1f;
  --color-border:       rgba(255,255,255,0.09);
  --color-border-sub:   rgba(255,255,255,0.06);

  --color-brand-solar:  #ffa16c;
  --color-accent:       #479ffa;
  --color-positive:     #4ebe96;
  --color-warn:         #e9a84a;
  --color-negative:     #e05454;

  --color-text-primary: #ffffff;
  --color-text-smoke:   #e6e6e6;
  --color-text-silver:  #cccccc;
  --color-text-ash:     #999999;
  --color-text-slate:   #868f97;

  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono:  'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --text-caption:    14px;
  --text-body:       16px;
  --text-subheading: 20px;
  --text-heading:    24px;
  --text-heading-lg: 40px;
  --text-display:    56px;

  --spacing-8:  8px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-64: 64px;
  --spacing-96: 96px;

  --radius-md:   4px;
  --radius-lg:   8px;
  --radius-full: 66px;
}
```
