# FinSwarm — Demo Video (LinkedIn)

Registro do processo de criação do vídeo demo profissional do FinSwarm via **Claude Design**, para publicação no LinkedIn.

**Status atual:** animação gerada e refinada no Claude Design, falta gravar com OBS e editar/finalizar.

---

## 1. Setup do ambiente (SSD/distro novos)

Após troca de SSD e distro (Fedora 44), apareceu o erro:
```
[poetry]ERROR: Could not install packages due to an OSError: [Errno 2]
No such file or directory: '/home/mateus/.local/bin/poetry'
```

**Causa:** symlink órfão em `~/.local/bin/poetry` apontando para `~/.local/share/pipx/venvs/poetry/bin/poetry` (que ficou no SSD antigo).

**Fix aplicado:**
```bash
rm ~/.local/bin/poetry
pipx install poetry
# → Poetry 2.4.1 instalado via pipx, Python 3.14.4
```

**pyproject.toml** exige `python = "^3.12"` — Python 3.14 satisfaz. Se algo quebrar por wheels faltando, fallback:
```bash
sudo dnf install python3.12
poetry env use python3.12
poetry install
```

### Erro 500 no /analyze

Botão "Analisar com FinSwarm" retornava `POST /analyze 500`.

**Causa:** `src/llm/client.py:22` faz `os.environ["OPENROUTER_API_KEY"]` — `.env` não veio do SSD antigo.

**Fix:** copiei `~/finswarm/.env` → `/mnt/Kingston/Coding/FinSwarm/.env` (já tem `OPENROUTER_API_KEY`). `src/api.py:28` chama `load_dotenv()` automaticamente.

---

## 2. Screenshots capturados

Pasta: `/mnt/Kingston/Coding/FinSwarm/prints/`

| # | Arquivo | Tela |
|---|---|---|
| 1 | `landpage.png` | Landing com tagline + ticker input "PETR4.SA" + grid 20 ações B3 |
| 2 | `visao-geral.png` | StockDetail topo: header PETR4 R$ 44.48, tabs, price chart, CTA laranja "Analisar PETR4 com FinSwarm" |
| 3 | `visao-geral-2.png` | StockDetail scrolled: "Sobre a empresa", controle acionário, notícias, gauge "Tendência de baixa" |
| 4 | `analise1(0%).png` | Análise iniciada — 0%, primeiro agente ativo |
| 5 | `analis2(43%).png` | 43% — "Sentimento de mercado" rodando |
| 6 | `analise3(57%).png` | 57% — "Argumentação de baixa" rodando |
| 7 | `analise4(71%).png` | 71% — maioria concluída |
| 8 | `analise5(86%).png` | 86% — quase finalizado |
| 9 | `relatorio1.png` | Relatório topo: MANTER 78%, target −6.5%, score 45/100, gráfico técnico, painel risco |
| 10 | `relatorio2.png` | Relatório bottom: fundamentos, bull/bear cases, síntese final 78% MANTER |

---

## 3. Decisão de duração

**45 segundos** (não 60s).

**Razões:**
- Retenção no LinkedIn cai forte após ~30s
- 30s é apertado demais — o "hero moment" dos 7 agentes precisa de ~15-20s pra respirar
- 45s permite 3 beats narrativos completos sem arrastar
- Bônus: dá pra extrair um teaser de 15s só com a parte dos agentes pra Stories/Reels

**Estrutura final:**

| Beat | Duração | Conteúdo |
|---|---|---|
| Hook | 0:00–0:04 | Landing, ticker types "PETR4", click "Analisar" |
| Stock context | 0:05–0:13 | Visão geral com motion-blur scroll, click no CTA laranja |
| **Hero — 7 agentes** | 0:14–0:25 | Counter 0→100%, agentes acendem, bento preenche |
| Veredicto | 0:26–0:32 | MANTER 78% reveal, stats animam, scroll para bull/bear |
| Breathing + outro | 0:33–0:42 | Veredicto respira, música encerra |
| End card | 0:43–0:45 | FinSwarm wordmark + tagline |

---

## 4. Prompts usados no Claude Design

### Prompt inicial (versão final, 45s)

Anexar todos os 10 PNGs em ordem. Prompt está documentado em conversa — pontos-chave:

- **Tone:** Cinematográfico tech (estilo Linear/Notion/Vercel reels)
- **Aesthetic:** Dark mode only, Solar Flare palette
  - Background: `#0a0908`
  - Primary orange: `#ffa16c`
  - Secondary blue: `#479ffa`
  - Text: `#f5f1e8`
- **Aspect:** 16:9 (1920×1080), 30fps
- **Duas sequências animadas explicitamente marcadas:**
  - (A) Scroll entre `visao-geral` ↔ `visao-geral-2` da mesma página
  - (B) Cross-fade entre as 5 frames de análise (0% → 100%)

### Correção 1 — bugs de overlay

Claude Design sobrepôs elementos HTML em cima dos screenshots, causando:
1. Costura visível entre prints durante scroll
2. Card de hover fora de enquadre no botão "Analisar"
3. Counter de % torto sobrepondo o original do screenshot
4. Count-up nos 3 stats do relatório fora de enquadre

**Regra de ouro aplicada:** *"Screenshots são ground truth. Animações só BETWEEN frames (transições, fades, cursor, background glows), nunca ON TOP de UI já renderizada no screenshot."*

Fixes específicos:
- Stock detail: cross-fades suaves (400ms) ao invés de scroll com costura
- Botão Analisar: remover hover card, manter só cursor + pulse contido
- Análise %: cross-fade entre os 5 PNGs, **zero overlays**
- Stat cards do relatório: remover count-up, deixar números estáticos do screenshot

### Correção 2 — refinamentos finais

Após o segundo pass, 4 problemas remanescentes:

1. **Cursor torto** → usar cursor macOS-style (seta preta com outline branco, 0° rotação) ou simples círculo pulsante
2. **Scroll seco demais** → simular scroll real com **motion blur vertical** (6–10px Y-axis blur durante translação de 350ms), mascarando a costura entre prints
3. **Análise lenta e seca** → reduzir hold por frame para 2.2s + cross-fade de 250ms entre frames (total: ~11s, antes ~18s)
4. **Relatório final** → mesma técnica motion-blur scroll entre `relatorio1` ↔ `relatorio2`, total ~7s (antes ~11s)

### Status do vídeo

✅ Animação ficou boa após correção 2
⚠️ Final do relatório ficou um pouco estático demais — **decisão:** cortar em pós (CapCut), não regenerar no Claude (risco de quebrar o que já está bom)

---

## 5. Gravação com OBS

**Instalação:**
```bash
sudo dnf install -y obs-studio
# ou flatpak install -y flathub com.obsproject.Studio
```

### Tentativa 1 — Crop no OBS (abandonada)

Setup tentado:
- Filter Crop/Pad com Left=268, Top=190, Right=269, Bottom=112 → área 1383×778 (16:9 exato)
- Resultado: encaixe horroroso com canvas, vídeo saiu com barras pretas
- Fit to Screen resolveu encaixe mas causou **upscaling** (1383×778 → 1920×1080) → qualidade ruim ("efeito WhatsApp")
- Reset Transform deixou 106px pretos embaixo

**Conclusão:** cropar no OBS é cheio de armadilhas. Melhor gravar nativo e cropar em pós.

### Setup final recomendado

**Settings → Video:**
- Base (Canvas) Resolution: **1920×1080** (ou nativa do monitor)
- Output (Scaled) Resolution: **mesmo valor**
- FPS: **60**
- Downscale Filter: **Lanczos**

**Source (Screen Capture PipeWire):**
- Remover filtro Crop/Pad
- Transform → Reset Transform (Ctrl+R)
- Transform → Fit to Screen (Ctrl+F)

**Settings → Output (Simple):**
- Recording Quality: **Indistinguishable Quality, Large File Size**
- Recording Format: **MP4** (ou MKV se preocupado com crash)
- Encoder: **NVENC H.264** se GPU NVIDIA, senão **x264**

**Audio Mixer:**
- Mutar Desktop Audio e Mic/Aux (voiceover vem depois)

### Checklist antes de gravar

- [ ] Animação em fullscreen no Claude Design
- [ ] Barra de controle do player escondida (cursor parado fora dela ~3s)
- [ ] Cursor movido pro canto extremo do monitor
- [ ] Notificações do sistema desativadas (Do Not Disturb)
- [ ] OBS Recording → Play na animação → Stop quando terminar

Arquivo salvo em `~/Videos/`.

---

## 6. Próximos passos

### 6.1. Gravar com OBS (pendente)

Aplicar setup final acima e gravar a animação completa em 1920×1080@60fps qualidade máxima.

### 6.2. Editar no CapCut (pendente)

1. Importar MP4 gravado
2. **Crop visual** — ajustar moldura no painel direito, travar em 16:9
3. **Cortar** o trecho estático do relatório final (provável segundo ~33–42)
4. Voiceover + música depois (Eleven Labs + Uppbeat/Pixabay)

### 6.3. Voiceover com Eleven Labs (pendente)

- Gerar script com **Gemini** (upload do vídeo, pedir timestamps por cena)
- Voz sugerida: Cody (energético) ou Rachel (versátil)
- Settings: Stability 55%, Clarity 75%, Speed 1.15x
- Idioma: PT-BR

### 6.4. Música royalty-free (pendente)

Estilo: slow cinematic tech, ~120 BPM, -20 dB de fundo

Sources:
- Uppbeat.io (free tier)
- Pixabay Music
- YouTube Audio Library

### 6.5. Export final (pendente)

Settings recomendados pro LinkedIn:
- Format: MP4 (H.264)
- Resolution: 1920×1080
- Frame rate: 60 fps
- Bitrate: 12 Mbps mínimo
- Audio: AAC 192 kbps 48 kHz

---

## 7. Lições aprendidas

1. **Claude Design não aceita bem overlays sobre screenshots** — screenshots são ground truth, animação só nas bordas/transições
2. **Cropar no editor de vídeo, não no OBS** — OBS é pra capturar em qualidade máxima, edição é pra refinar enquadramento
3. **Motion blur é o truque pra esconder costura entre prints de mesma página** durante scroll simulado
4. **Cross-fade > hard cut** entre frames sequenciais — sensação de continuidade vs slideshow
5. **45s é o sweet spot pro LinkedIn** com narrativa em 3 beats
6. **Não regenerar coisa que já está boa** — cortes em pós custam 30s, regeneração arrisca quebrar

---

## 8. Referências

- Tutorial original: `~/finswarm/claude_drawer/tutorial-demo.md`
- Contexto inicial: `/mnt/Kingston/Coding/FinSwarm/demo-claude.md`
- Status do projeto: `~/finswarm/docs/STATUS.md`
- Design system: `~/finswarm/docs/design/style.md`
- Claude Design: https://claude.ai/design
- Eleven Labs: https://elevenlabs.io
- Gemini: https://gemini.google.com
