import type { AgentName } from './types'

export const AGENT_LABELS: Record<AgentName, string> = {
  technical: 'Análise técnica',
  fundamental: 'Análise fundamentalista',
  sentiment: 'Sentimento de mercado',
  bull: 'Argumentação de alta',
  bear: 'Argumentação de baixa',
  risk: 'Avaliação de risco',
  synthesis: 'Síntese final',
}

export const AGENT_RUNNING_PHRASES: Record<AgentName, string> = {
  technical: 'Lendo indicadores técnicos…',
  fundamental: 'Avaliando fundamentos da empresa…',
  sentiment: 'Processando notícias recentes…',
  bull: 'Construindo argumentos de alta…',
  bear: 'Construindo argumentos de baixa…',
  risk: 'Calculando risco e stop-loss…',
  synthesis: 'Compilando o relatório final…',
}
