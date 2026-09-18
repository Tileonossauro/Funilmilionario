import type { MetricKey } from '@/domain/metrics/keys'

/**
 * Registro declarativo das etapas. Adicionar um tipo novo é acrescentar uma entrada
 * aqui — nenhum componente, nenhuma query e nenhum prompt precisa ser tocado.
 */

export const FAMILIES = ['trafego', 'conteudo', 'pagina', 'contato', 'produto', 'outros'] as const
export type Family = (typeof FAMILIES)[number]

export const FAMILY_META: Record<Family, { label: string; hue: string }> = {
  trafego: { label: 'Tráfego', hue: 'violet' },
  conteudo: { label: 'Conteúdo', hue: 'amber' },
  pagina: { label: 'Páginas', hue: 'sky' },
  contato: { label: 'Contato', hue: 'emerald' },
  produto: { label: 'Produto', hue: 'rose' },
  outros: { label: 'Outros', hue: 'slate' },
}

export interface TaskRule {
  /** Título da tarefa criada automaticamente quando a etapa nasce. */
  titulo: string
  /** Prazo em dias a partir da criação. */
  prazoDias: number
}

export interface NodeTypeDef {
  family: Family
  label: string
  icon: string
  /** Métricas que fazem sentido nesta etapa — define o formulário de lançamento. */
  metrics: MetricKey[]
  /** Tarefa de acompanhamento disparada na criação. Ausente = não cria tarefa. */
  taskRule?: TaskRule
  /** Etapa de fim de jornada: não ter saída é legítimo. */
  terminal?: boolean
}

export const NODE_TYPES = {
  // ── Tráfego ───────────────────────────────────────────────────────────────
  instagram: {
    family: 'trafego', label: 'Instagram', icon: '◎',
    metrics: ['impressoes', 'cliques', 'visitantes'],
    taskRule: { titulo: 'Conferir alcance e cliques do perfil', prazoDias: 7 },
  },
  meta_ads: {
    family: 'trafego', label: 'Meta Ads', icon: '◈',
    metrics: ['investimento', 'impressoes', 'cliques', 'leads'],
    taskRule: { titulo: 'Revisar investimento e CPL da campanha', prazoDias: 1 },
  },
  google_ads: {
    family: 'trafego', label: 'Google Ads', icon: '◇',
    metrics: ['investimento', 'impressoes', 'cliques', 'leads'],
    taskRule: { titulo: 'Revisar investimento e CPL da campanha', prazoDias: 1 },
  },
  tiktok: {
    family: 'trafego', label: 'TikTok', icon: '♪',
    metrics: ['impressoes', 'cliques', 'visitantes'],
  },
  youtube: {
    family: 'trafego', label: 'YouTube', icon: '▷',
    metrics: ['impressoes', 'cliques', 'visitantes'],
  },
  seo: {
    family: 'trafego', label: 'SEO / Busca', icon: '⌕',
    metrics: ['impressoes', 'cliques', 'visitantes'],
  },
  indicacao: {
    family: 'trafego', label: 'Indicação', icon: '♡',
    metrics: ['leads', 'vendas'],
  },

  // ── Conteúdo ──────────────────────────────────────────────────────────────
  reels: {
    family: 'conteudo', label: 'Reels', icon: '▶',
    metrics: ['impressoes', 'cliques', 'visitantes'],
    taskRule: { titulo: 'Conferir métricas do Reels', prazoDias: 3 },
  },
  story: {
    family: 'conteudo', label: 'Story', icon: '○',
    metrics: ['impressoes', 'cliques'],
    taskRule: { titulo: 'Conferir visualizações e cliques do Story', prazoDias: 2 },
  },
  post: { family: 'conteudo', label: 'Post', icon: '▣', metrics: ['impressoes', 'cliques'] },
  video: { family: 'conteudo', label: 'Vídeo', icon: '▶', metrics: ['impressoes', 'cliques'] },
  vsl: { family: 'conteudo', label: 'VSL', icon: '▤', metrics: ['visitantes', 'leads'] },

  // ── Páginas ───────────────────────────────────────────────────────────────
  landing_page: {
    family: 'pagina', label: 'Landing Page', icon: '▭',
    metrics: ['visitantes', 'leads'],
    taskRule: { titulo: 'Conferir dados da Landing Page', prazoDias: 3 },
  },
  pagina_vendas: {
    family: 'pagina', label: 'Página de vendas', icon: '▬',
    metrics: ['visitantes', 'vendas', 'receita'],
    taskRule: { titulo: 'Conferir conversão da página de vendas', prazoDias: 3 },
  },
  checkout: {
    family: 'pagina', label: 'Checkout', icon: '▢',
    metrics: ['visitantes', 'vendas', 'receita'],
    taskRule: { titulo: 'Conferir abandono de checkout', prazoDias: 3 },
  },
  formulario: {
    family: 'pagina', label: 'Formulário', icon: '▥',
    metrics: ['visitantes', 'leads'],
  },

  // ── Contato ───────────────────────────────────────────────────────────────
  whatsapp: {
    family: 'contato', label: 'WhatsApp', icon: '✆',
    metrics: ['conversas', 'ativacoes', 'vendas'],
    taskRule: { titulo: 'Conferir conversas e respostas no WhatsApp', prazoDias: 2 },
  },
  dm: { family: 'contato', label: 'Direct / DM', icon: '✉', metrics: ['conversas', 'ativacoes'] },
  email: { family: 'contato', label: 'E-mail', icon: '@', metrics: ['leads', 'cliques'] },
  ligacao: { family: 'contato', label: 'Ligação', icon: '☎', metrics: ['conversas', 'vendas'] },

  // ── Produto ───────────────────────────────────────────────────────────────
  cadastro: { family: 'produto', label: 'Cadastro', icon: '✚', metrics: ['leads', 'ativacoes'] },
  trial: {
    family: 'produto', label: 'Teste grátis', icon: '◐',
    metrics: ['ativacoes', 'vendas'],
    taskRule: { titulo: 'Conferir quantos trials ativaram', prazoDias: 7 },
  },
  ativacao: { family: 'produto', label: 'Ativação', icon: '✦', metrics: ['ativacoes'] },
  assinatura: {
    family: 'produto', label: 'Assinatura', icon: '★',
    metrics: ['vendas', 'receita'], terminal: true,
    taskRule: { titulo: 'Conferir assinaturas e receita', prazoDias: 7 },
  },
  app: { family: 'produto', label: 'Aplicativo', icon: '▦', metrics: ['ativacoes', 'vendas'] },

  // ── Outros ────────────────────────────────────────────────────────────────
  condicao: { family: 'outros', label: 'Condição', icon: '◆', metrics: [] },
  nota: { family: 'outros', label: 'Nota', icon: '✎', metrics: [], terminal: true },
} as const satisfies Record<string, NodeTypeDef>

export type NodeType = keyof typeof NODE_TYPES

export const NODE_TYPE_LIST = Object.keys(NODE_TYPES) as NodeType[]

export function isNodeType(value: string): value is NodeType {
  return value in NODE_TYPES
}

export function getNodeType(type: NodeType): NodeTypeDef {
  return NODE_TYPES[type]
}

export function typesByFamily(family: Family): NodeType[] {
  return NODE_TYPE_LIST.filter((t) => NODE_TYPES[t].family === family)
}

/** Etapas que não são de jornada — ficam fora de qualquer análise. */
export function isStructural(type: NodeType): boolean {
  return type === 'nota'
}
