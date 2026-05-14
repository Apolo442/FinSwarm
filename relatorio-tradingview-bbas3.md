# Relatório de Análise Estrutural — TradingView BBAS3
**Documento de referência para recriação de produto financeiro**
**Ativo analisado:** Banco do Brasil S.A. — BBAS3 (BMFBOVESPA)
**Data da análise:** 14 de maio de 2026
**Fonte:** Arquivos HTML das subpáginas do símbolo BBAS3 no TradingView (br.tradingview.com)

---

## Visão Geral da Arquitetura

O TradingView organiza a página de símbolo de um ativo em três camadas hierárquicas fixas que se repetem em todas as subpáginas sem exceção:

1. **Header global da plataforma** — presente em todas as páginas com navegação institucional
2. **Header contextual do ativo** — identifica o símbolo, exibe cotação e contém a barra de abas
3. **Área de conteúdo modular** — única área que varia entre as subpáginas

Essa arquitetura de shell comum com conteúdo trocável por abas é implementada semanticamente com `role="tablist"` e tabs individuais com `role="tab"`, cada uma apontando para uma rota temática distinta. O rodapé é idêntico em todas as páginas.

### Identificadores do ativo (presentes em todas as páginas)

| Campo | Valor |
|---|---|
| Nome | Banco do Brasil S.A. |
| Ticker | BBAS3 |
| Bolsa | B3 / BMFBOVESPA |
| ISIN | BRBBASACNOR3 |
| FIGI | BBG000BG5W05 |
| Categoria | Stock |
| Preço (referência 14/05/2026) | 20,67 BRL |

---

## Componentes Globais Recorrentes

### Header global da plataforma
Presente em todas as páginas, contém:
- Logo TradingView com link para a página principal
- Menu de navegação horizontal com itens: **Produtos**, **Comunidade**, **Mercados**, **Corretoras**, **Mais**
- Campo de busca de ativos
- Botões de login/cadastro (desktop)
- Botão de menu hambúrguer (mobile)
- Seletor de idioma

### Header contextual do ativo
Presente em todas as subpáginas, composto por:
- Logo da empresa (múltiplos tamanhos: `xxxsmall`, `small`, `medium`, `large`, `xxxlarge`)
- Nome completo: "Banco do Brasil S.A." em `<h1>`
- Botão de ticker com logo da bolsa B3
- Badge de status do mercado ("Mercado aberto") com ícone circular colorido e `color-green`
- Bloco de cotação com:
  - Preço atual (`js-symbol-last`)
  - Variação absoluta e percentual com direção (`up-OXLSZCm` / `down`)
  - Horário da última atualização
  - Indicador de cotação atrasada em 15 minutos ("D") para usuários não premium
- Ações auxiliares rápidas: "Gráfico completo", "Fazer captura de tela", "Obter widget"

### Barra de abas (subheader categórico)
Implementada com `role="tablist"` e `aria-orientation="horizontal"`, contém 8 abas mais um botão "Mais":

| # | Aba | Rota |
|---|---|---|
| 1 | Visão geral | `/symbols/BMFBOVESPA-BBAS3/` |
| 2 | Finanças | `/symbols/BMFBOVESPA-BBAS3/financials-overview/` |
| 3 | Notícias | `/symbols/BMFBOVESPA-BBAS3/news/` |
| 4 | Comunidade | `/symbols/BMFBOVESPA-BBAS3/ideas/` |
| 5 | Sinais técnicos | `/symbols/BMFBOVESPA-BBAS3/technicals/` |
| 6 | Previsões | `/symbols/BMFBOVESPA-BBAS3/forecast/` |
| 7 | Sazonais | `/symbols/BMFBOVESPA-BBAS3/seasonals/` |
| 8 | Títulos | `/symbols/BMFBOVESPA-BBAS3/bonds/` |

A aba ativa recebe `aria-selected="true"` e classe `selected-StZ98i8e`. Um indicador de sublinhado animado (`underline-uKnMxgHn`) se desloca horizontalmente com `transform: translateX()` e `scaleX()` para indicar a seleção atual.

### Rodapé global
Idêntico em todas as páginas, organizado em colunas de links com os grupos:
- Mais do que um produto (Supergráficos)
- Rastreadores (Ações, ETFs, Títulos, Criptomoedas, Pares CEX/DEX, Pine)
- Mapas de Calor (Ações, ETFs, Cripto)
- Ferramentas e assinaturas (Recursos, Preços, Dados de mercado, Planos de presentes)
- Trade (Visão geral, Principais corretoras, Comparação de corretoras)
- Comunidade (Rede social, Mural do Amor, Indique um Amigo, Regras, Moderadores)
- Ideias (Trade, Educacional, Sugestão da Casa)
- Pine Script (Indicadores e estratégias, Wizards, Freelancers)
- Mercados (Ações, Forex, Criptomoedas, Conjunto de ações EUA)
- Calendários (Economia, Resultados, Dividendos)
- Mais produtos (Curvas de Rendimento, Opções, Mapas de Macro, News Flow, Pine Script docs)
- Apps (Dispositivo Móvel, Desktop)
- Sobre a empresa (Quem somos, Missão espacial, Blog, Carreiras, Media kit)
- Merchan (Loja TradingView, Cartas de Tarô para traders, The C63 TradeTime)
- Políticas e segurança (Termos, Aviso legal, Privacidade, Cookies, Acessibilidade, Segurança, Bounty, Status)
- Soluções para negócios (Widgets, Bibliotecas de gráficos, Lightweight Charts, Gráficos Avançados, Plataforma de Negociação)

**Créditos de dados** exibidos no rodapé: ICE Data Services, FactSet Research Systems Inc., American Bankers Association (CUSIP), Quartr (arquivos SEC), Copyright 2026 TradingView Inc.

**Redes sociais** linkadas: X (Twitter), Facebook, YouTube, Instagram, LinkedIn, TikTok, Telegram, Reddit

---

## Página 1 — Visão Geral

**URL:** `/symbols/BMFBOVESPA-BBAS3/`
**Função:** Landing page de agregação do ativo. Apresenta um panorama completo do símbolo por meio de widgets-resumo empilhados.

### Estrutura de conteúdo (ordem de aparição)

| Posição | Bloco/Widget | Conteúdo |
|---|---|---|
| 1 | Gráfico de performance | Gráfico interativo com canvas, controles de intervalo, botão "Gráfico completo", screenshot e widget |
| 2 | Resultados recentes | Data do relatório, período, EPS e Receita do último trimestre |
| 3 | Principais estatísticas | Valor de mercado, Dividend yield, P/L 12M, EPS básico 12M |
| 4 | Perfil da empresa | Descrição dos 5 segmentos, fundada em 1971, CEO, site, colaboradores (85,95K) |
| 5 | Controle acionário | Gráfico de pizza: Closely held 50,39% vs Free Float 49,61% |
| 6 | Notícias | Feed resumido com link para a aba completa |
| 7 | Ideias da comunidade | Cards de análises de usuários |
| 8 | Sinais técnicos | Velocímetro de recomendação |
| 9 | Classificação de analistas | Resumo de consenso |
| 10 | Sazonais | Miniatura do gráfico sazonal |
| 11 | Títulos | Cards de instrumentos de dívida |
| 12 | FAQ | Acordeão com 13+ perguntas e respostas |

### Componente: Gráfico de performance
- Implementado com `lightweight-charts` (canvas SVG)
- Dimensão padrão: 1636×292px para a área de plotagem
- Dois canvas sobrepostos (`z-index: 1` para renderização e `z-index: 2` para interação)
- Controles de intervalo disponíveis na interface
- Ações: "Gráfico completo" (link para `/chart?symbol=BMFBOVESPABBAS3`), captura de tela, obter widget embed

### Componente: Resultados recentes
- Data: 13 de maio de 2026
- Período: Q1 2026
- EPS: 0,54 BRL (estimativa era 0,60 BRL → surpresa de −10,67%)
- Receita: 42,84 B BRL (estimativa: 38,14 B BRL)
- Próximo relatório: 12 de agosto de 2026
- EPS estimado próximo trimestre: 0,91 BRL

### Componente: Principais estatísticas (Fatos principais)
- Valor de Mercado: 118,72 B BRL
- Rendimento do dividendo indicado: 0,00
- Razão Preço/Lucro 12M: 8,65×
- EPS Básico 12M: 2,40 BRL
- Fundada: 1971
- Colaboradores AF: 85,95K
- CEO: Tarciana Paula Gomes Medeiros
- Site: bb.com.br

### Componente: FAQ (acordeão em duas colunas)
Estrutura: `div.wrapper-cREtlSY.twoColumns-cREtlSY` com dois grupos de `div.column-cREtlSY`. Cada item usa `<button class="summary-i4FV5Ith">` com `aria-expanded="false"` e `aria-controls` apontando para o detalhe. As perguntas cobrem:
- Qual é o ticker de BBAS3?
- O preço da ação está crescendo? (−6,30% semana, −16,65% mês, −29,37% ano)
- Qual a previsão? (máx. 39,00 BRL, mín. 21,00 BRL)
- Qual a máxima e mínima históricas? (máx. 30,04 BRL em 08/05/2025; mín. 0,00893132 BRL em 06/01/1993)
- Qual a volatilidade? (6,84%, beta 1,36)
- Qual o valor de mercado? (118,51 B)
- A empresa publica relatórios?
- Quando será o próximo resultado? (12/08/2026)
- Qual foi o lucro no último trimestre? (0,54 BRL/ação, estimativa 0,60 BRL)
- Qual foi a receita no último trimestre? (42,84 B BRL, estimativa 38,14 B BRL)
- Qual o lucro líquido? (5,24 B BRL)
- É uma boa ação para dividendos? (yield 4,16% em 2025, payout 38,02%)
- Quantos colaboradores? (85,95K em 14/05/2026)
- Como comprar ações de BBAS3?
- Devo investir em BBAS3?

---

## Página 2 — Finanças

**URL:** `/symbols/BMFBOVESPA-BBAS3/financials-overview/`
**Função:** Hub de fundamentos financeiros. Contém subtabs internas e widgets de análise quantitativa.

### Subtabs internas (barra de abas secundária — `role="tablist"` com `roundTabs`)

| # | Subtab | Rota interna |
|---|---|---|
| 1 | Visão geral | `/financials-overview/` |
| 2 | Demonstrações | `/financials-income-statement` |
| 3 | Estatísticas | `/financials-statistics-and-ratios` |
| 4 | Dividendos | `/financials-dividends` |
| 5 | Resultados | `/financials-earnings` |
| 6 | Receita | `/financials-revenue` |
| + | Mais | (botão de overflow) |

Cada subtab tem botão de compartilhamento (ícone de share) no cabeçalho da seção.

### Seções exibidas em Visão Geral de Finanças

#### 1. Fatos Principais
Grid de KPIs com valores e links para aprofundamento:
- Valor de Mercado: 118,72 B BRL
- Rendimento do dividendo indicado: 0,00
- Razão P/L 12M: 8,65×
- EPS Básico 12M: 2,40 BRL
- Fundada: 1971
- Colaboradores AF: 85,95K
- CEO: Tarciana Paula Gomes Medeiros
- Site: bb.com.br

#### 2. Sobre (Perfil da empresa)
Descrição textual dos 5 segmentos do banco: bancário, investimentos, gestor de fundos, seguros, pagamentos eletrônicos. Com botão "Mostrar Mais" (collapsed por padrão).

#### 3. Controle Acionário
- Gráfico de pizza SVG com dois arcos
- Ações Closely held: 2,88 B (50,39%) — cor `#5B9CF6`
- Ações Free Float: 2,83 B (49,61%) — cor `#FFAB40`

#### 4. Estrutura de Capital
- Gráfico de barras com 3 colunas: Enterprise Value, dívida líquida, market cap
- Métricas:
  - Valor de mercado: 118,72 B
  - Dívida: 1,07 T
  - Participações Minoritárias: 4,36 B
  - Caixa e equivalentes: 139,75 B
  - Valor da Empresa: 1,05 T
- Seletor de período: **Anual** / **Trimestral** (squareTabs)

#### 5. Valoração
- Gráfico de pizza multi-camadas com valor de mercado, lucro líquido e receita líquida
- Razão P/L: 8,65×
- Razão P/S: 0,81×
- Selector Anual/Trimestral
- Sub-seção "Razões de Valuation" com mais métricas

#### 6. Crescimento
- Gráficos de barras de crescimento histórico
- Eixo temporal: 2021–2025

#### 7. Rentabilidade
- Gráficos de rentabilidade histórica

#### 8. Dividendos
- Rendimento do Dividendo TTM: 2,40
- Próximo pagamento: 0,082
- Próxima data ex-dividendo: 2 de junho de 2026
- Gráfico de histórico de dividendos (2021–2025) com linha de Dividendos por Ação AF e Rendimento do Dividendo AF

#### 9. Saúde Financeira
- Sub-seção "Empréstimos e depósitos de clientes" com barras anuais:
  - Empréstimos Líquidos — cor `#f06292`
  - Depósitos totais — cor `#00bcd4`
  - Provisões para perdas com empréstimos — cor `#5B9CF6`
- Eixo temporal: 2021–2025, escala: 0 a 1,50 T BRL
- Sub-seção "Análise da adequação do capital"

#### 10. Estimativas
- Seção "Receita" e "Resultados" com gráficos de pontos (real vs. estimativa)
- Pontos diferenciados: estimativa (círculo vazado) vs. realizado (círculo preenchido)
- Título "Próximo relatório: 15 de fev."

---

## Página 3 — Notícias

**URL:** `/symbols/BMFBOVESPA-BBAS3/news/`
**Função:** Feed cronológico de notícias relacionadas ao ativo BBAS3.

### Estrutura de conteúdo
- Modelo de página: listagem de itens homogêneos em fluxo cronológico
- Cada item de notícia contém: horário de publicação, símbolo relacionado, título da notícia, provedor/fonte
- Nenhuma paginação explícita visível — scroll infinito ou carregamento por demanda
- Não há blocos extras além do shell global e do feed

### Comportamento
- Conteúdo carregado dinamicamente via `window.NEWSSERVICEURL` (`https://news-headlines.tradingview.com`)
- Streaming ativado via `window.NEWSSTREAMINGURL` (`https://notifications.tradingview.com/news/channel`)
- Feature flags no HTML confirmam: `moveideasandmindsintonews1.0`, `newsusemediatorstory1.0`, `newsenablestreaming1.0`

### Observação de design
- Página mais enxuta estruturalmente
- Foco total em legibilidade e atualização contínua
- Não possui FAQ nem widgets-resumo laterais

---

## Página 4 — Comunidade (Ideias)

**URL:** `/symbols/BMFBOVESPA-BBAS3/ideas/`
**Função:** Feed de análises e ideias publicadas por usuários da comunidade sobre BBAS3.

### Estrutura de conteúdo
- Modelo de página: feed de cards de conteúdo social
- Cada card de ideia contém: título da análise, autor, tese resumida, contexto gráfico da análise (imagem ou miniatura), tags de ativo e direção (alta/baixa)
- Exemplo encontrado no HTML: análise sobre possível formação de OCOI

### Comportamento
- Conteúdo gerado pela comunidade (UGC)
- Feature flags: `moveideasandmindsintonews1.0`, `enablerichTextinminds1.0`, `enablenewdesignincommunityhub1.0`
- Sem subtabs internas

### Diferenças da aba Notícias
| Característica | Notícias | Comunidade |
|---|---|---|
| Conteúdo | Jornalístico/editorial | Análises de usuários (UGC) |
| Formato do item | Linha com título e fonte | Card com imagem e tese |
| Autoria | Veículos externos | Usuários do TradingView |
| Tom | Informativo | Analítico/opinativo |

---

## Página 5 — Sinais Técnicos

**URL:** `/symbols/BMFBOVESPA-BBAS3/technicals/`
**Função:** Dashboard de análise técnica com indicadores, osciladores e médias móveis.

### Estrutura de conteúdo

#### Bloco 1: Resumo de recomendação (velocímetro)
- Visualização de gauge/velocímetro com sinal sintético
- Labels disponíveis: "Viés de baixa forte", "Tendência de Baixa", "Tendência Neutra", "Viés de alta", "Viés de alta forte"
- Status em 14/05/2026: **Venda** (hoje, 1 semana e 1 mês)

#### Bloco 2: Osciladores
- Tabela com colunas: Nome, Valor, Ação
- Classificação geral dos osciladores: **Neutra**
- Descrição: conta quantos osciladores mostram neutralidade, venda e compra

#### Bloco 3: Médias Móveis (MAs)
- Tabela com colunas: Nome, Valor, Ação
- Classificação geral de MAs: **Venda forte**
- Tipos de MA: simples, exponencial e ponderada em múltiplos períodos

#### Bloco 4: Pivôs
- Tabela com níveis de suporte e resistência
- Descrição técnica: "um nível de preço importante no qual os traders esperam que o preço continue na direção atual ou inverta o curso"

#### Bloco 5: FAQ (acordeão em duas colunas)
Perguntas cobertas:
- O que são pivôs nas negociações?
- Que outros indicadores são usados nos cálculos? (Ichimoku Cloud, MACD e outros)
- Devo comprar as ações de BBAS3? (sinal de venda hoje e em 1 semana/1 mês)
- O que são osciladores e o que eles mostram?
- O que são as médias móveis? Elas são úteis?
- Quão confiável é a análise técnica?

### Metadados de SEO (extraídos do `<head>`)
- `<meta name="description">`: "Quais ferramentas de análise técnica podem ser usadas para analisar Banco do Brasil S.A.? Confira vários osciladores, médias móveis e outros indicadores técnicos no TradingView."

---

## Página 6 — Previsões

**URL:** `/symbols/BMFBOVESPA-BBAS3/forecast/`
**Função:** Consenso de analistas, preço-alvo e projeções de receita/resultado.

### Estrutura de conteúdo

#### Bloco 1: Preço-alvo
- Preço máximo estimado pelos analistas: 39,00 BRL
- Preço mínimo estimado pelos analistas: 21,00 BRL
- Gráfico de distribuição das estimativas

#### Bloco 2: Classificação de analistas
- Distribuição de recomendações: compra forte, compra, neutro, venda, venda forte
- Número de analistas por classificação

#### Bloco 3: Resultados (EPS)
- Tabela comparando: Período, Reportado, Estimado, Surpresa
- Último trimestre: EPS 0,54 BRL vs. estimativa 0,60 BRL (surpresa −10,67%)
- Próximo trimestre estimado: 0,91 BRL/ação

#### Bloco 4: Receita
- Tabela comparando: Período, Reportado, Receita estimada, Surpresa
- Último trimestre: 42,84 B BRL vs. estimativa 38,14 B BRL
- Próximo trimestre estimado: 41,58 B BRL

### Metadados de SEO (extraídos)
- Título da página: "Previsão BBAS3 — Preço Alvo para 2027 — TradingView"

---

## Página 7 — Sazonais

**URL:** `/symbols/BMFBOVESPA-BBAS3/seasonals/`
**Função:** Ferramenta analítica de sazonalidade — exibe comportamento histórico de preço por período do ano.

### Estrutura de conteúdo

#### Elemento central: Gráfico sazonal
- Visualização principal: sobreposição de curvas de preço de anos anteriores (ex: 2020–2025)
- Filtros de período: seleção por anos individuais
- Objetivo: identificar padrões e tendências recorrentes (sazonais)

#### Bloco de texto introdutório
- Explicação didática da ferramenta: como usar gráficos sazonais para identificar movimentos históricos repetitivos

### Características de design
- Página orientada à ferramenta, não ao conteúdo textual
- Estrutura muito mais enxuta do que Finanças ou Sinais Técnicos
- O gráfico é o elemento dominante da página
- Texto atua como apoio contextual ao gráfico

---

## Página 8 — Títulos

**URL:** `/symbols/BMFBOVESPA-BBAS3/bonds/`
**Função:** Catálogo de instrumentos de dívida corporativa emitidos pelo Banco do Brasil S.A.

### Estrutura de conteúdo

#### Bloco introdutório
- Texto explicativo sobre títulos corporativos como alternativa de investimento mais estável em contextos de volatilidade do mercado acionário

#### Tabela de títulos (screener de bonds)
Colunas da tabela:

| Coluna | Descrição |
|---|---|
| Símbolo | Identificador do título |
| YTM | Yield to Maturity (rentabilidade até o vencimento) |
| Volume | Volume negociado |
| Preço | Preço de mercado |
| Cupom | Taxa de cupom fixo |
| Vencimento | Data de expiração |
| Montante em circulação | Total emitido em mercado |
| Valor de face | Par value do título |
| Denominação mínima | Mínimo negociável |
| Emissor | Identificação do banco emissor |

#### CTA
- Botão/link "Ver todos os títulos BBAS3"

### Características de design
- Página mais próxima de um screener ou inventário financeiro
- Foco total na tabela comparável
- Legibilidade de colunas numéricas com `tabular-nums` (inferido do padrão da plataforma)

---

## Mapa de Componentes Reutilizáveis

A análise das 8 páginas revela um conjunto de componentes autônomos que se repetem em diferentes combinações:

| Componente | Páginas que usam |
|---|---|
| Shell de identificação do ativo (nome, ticker, logo, cotação, status) | Todas |
| Barra de tabs categóricas (`role="tablist"`) | Todas |
| Widget de gráfico interativo (canvas, lightweight-charts) | Visão geral, Sazonais |
| Card de KPI (título + valor + moeda) | Visão geral, Finanças |
| Gráfico de pizza SVG (estrutura acionária, valoração) | Finanças |
| Gráfico de barras históricas (2021–2025) | Finanças |
| Gráfico de pontos (real vs. estimativa) | Finanças, Previsões |
| Velocímetro de recomendação técnica | Sinais técnicos, Visão geral |
| Tabela analítica (Nome / Valor / Ação) | Sinais técnicos |
| Feed de listagem cronológica | Notícias |
| Cards de conteúdo social | Comunidade |
| Tabela de instrumentos financeiros (screener) | Títulos |
| FAQ em acordeão de duas colunas | Visão geral, Sinais técnicos |
| Subtabs internas arredondadas (`roundTabs`) | Finanças |
| Seletor Anual/Trimestral (`squareTabs`) | Finanças |
| Bloco "Sobre" com texto colapsável | Finanças, Visão geral |
| Aviso "Fique atento" (disclaimer legal) | Sinais técnicos, Visão geral |

---

## Classificação Funcional das Páginas

As 8 subpáginas se dividem em 4 famílias funcionais distintas:

| Família | Páginas | Característica central |
|---|---|---|
| **Agregação panorâmica** | Visão geral | Múltiplos widgets-resumo empilhados com links para aprofundamento |
| **Análise quantitativa** | Finanças, Sinais técnicos, Previsões | Tabelas, gráficos e KPIs com dados numéricos precisos |
| **Fluxo de conteúdo** | Notícias, Comunidade | Listagens cronológicas ou feeds de cards com atualização contínua |
| **Ferramenta / Catálogo** | Sazonais, Títulos | Experiência centrada em uma visualização específica ou tabela de inventário |

---

## Padrões de UX Relevantes para Redesign

### 1. Hub de decisão
O ativo não é tratado apenas como cotação, mas como uma entidade completa. O usuário navega por preço, fundamentos, técnica, consenso, sazonalidade, conteúdo social, notícias e instrumentos relacionados sem sair do contexto do ticker.

### 2. Teaser → aprofundamento
A Visão geral usa todos os outros módulos como blocos de "vitrine". Cada bloco tem link direto para a aba completa correspondente. Este padrão aumenta a retenção por reduzir a fricção entre descoberta e aprofundamento.

### 3. FAQ como camada semântica
O FAQ não é apenas conteúdo de SEO. Ele mapeia as dúvidas centrais do ciclo cognitivo do usuário: "o que é", "quanto vale", "como se comporta", "o que esperam dela" e "o que fazer". É uma referência para definir quais módulos o novo produto precisa responder.

### 4. Dados sempre contextualizados
Números isolados nunca aparecem sem contexto: EPS vem acompanhado de estimativa e surpresa; dividendo vem com yield e payout; preço vem com variação e horário.

### 5. Progressividade textual
Textos longos (perfil da empresa, explicações técnicas) aparecem colapsados com "Mostrar Mais". Isso mantém a densidade de informação sem sobrecarregar visualmente a página inicial.

### 6. Modo escuro nativo
O HTML declara `meta name="theme-color"` para `prefers-color-scheme: light` (`#F9F9F9`) e dark (`#262626`), confirmando suporte nativo a ambos os temas.

---

## Observações Técnicas de Implementação

- **Framework de gráficos:** TradingView Lightweight Charts (library proprietária), com canvas HTML5
- **Streaming de dados:** WebSocket via `window.PUSHSTREAMURL` (`wss://pushstream.tradingview.com`)
- **Notícias em tempo real:** `window.NEWSSTREAMINGURL` e `window.NEWSMEDIATORURL`
- **Cotações em tempo real:** `js-symbol-last`, `js-symbol-change-direction`, `js-symbol-currency`
- **Widget bar lateral:** Colapsável/expansível com `is-widgetbar-expanded`, afeta layout
- **Dados financeiros:** FactSet Research Systems Inc. e ICE Data Services
- **Arquivos SEC:** Quartr
- **Analytics:** Snowplow (`snowplow-pixel.tradingview.com`)
- **Autenticação social:** Google Identity Services (OAuth)
- **Módulos CMS:** Widgets identificados por `data-cms-base-widget`, `data-container-name` e `data-an-widget-id`
- **Responsividade:** Breakpoints confirmados pelo código JS: `popup-wide` ativa em 1576px, `page-wide` em 1530px
- **Semântica estrutural:** BreadcrumbList schema.org com 6 níveis: Mercados → Brasil → Ações → Financeiro → Grandes Bancos → BBAS3

