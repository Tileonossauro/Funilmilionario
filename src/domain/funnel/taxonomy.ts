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
  /**
   * Quantas pessoas ENTRAM e quantas SAEM desta etapa.
   *
   * É o que torna o funil legível como funil: a conversão da etapa é
   * saida/entrada, e a taxa de passagem entre duas etapas ligadas é
   * entrada(destino)/saida(origem). Sem esse par, "conversão" viraria
   * heurística e o mesmo número significaria coisas diferentes em cada etapa.
   */
  volumeIn?: MetricKey
  volumeOut?: MetricKey
  /** Etapa onde o dinheiro entra: ganha campo de preço e alimenta a projeção. */
  temPreco?: boolean
  /** Tarefa de acompanhamento disparada na criação. Ausente = não cria tarefa. */
  taskRule?: TaskRule
  /** Etapa de fim de jornada: não ter saída é legítimo. */
  terminal?: boolean
}

export const NODE_TYPES = {
  // ── Tráfego ───────────────────────────────────────────────────────────────
  instagram: {
    family: 'trafego', label: 'Instagram', icon: 'instagram',
    metrics: ['impressoes', 'cliques', 'visitantes'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
    taskRule: { titulo: 'Conferir alcance e cliques do perfil', prazoDias: 7 },
  },
  meta_ads: {
    family: 'trafego', label: 'Meta Ads', icon: 'ads',
    metrics: ['investimento', 'impressoes', 'cliques', 'leads'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
    taskRule: { titulo: 'Revisar investimento e CPL da campanha', prazoDias: 1 },
  },
  google_ads: {
    family: 'trafego', label: 'Google Ads', icon: 'busca',
    metrics: ['investimento', 'impressoes', 'cliques', 'leads'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
    taskRule: { titulo: 'Revisar investimento e CPL da campanha', prazoDias: 1 },
  },
  tiktok: {
    family: 'trafego', label: 'TikTok', icon: 'musica',
    metrics: ['impressoes', 'cliques', 'visitantes'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
  },
  youtube: {
    family: 'trafego', label: 'YouTube', icon: 'play',
    metrics: ['impressoes', 'cliques', 'visitantes'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
  },
  seo: {
    family: 'trafego', label: 'SEO / Busca', icon: 'busca',
    metrics: ['impressoes', 'cliques', 'visitantes'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
  },
  indicacao: {
    family: 'trafego', label: 'Indicação', icon: 'pessoas',
    metrics: ['leads', 'vendas'],
    volumeIn: 'leads', volumeOut: 'vendas',
  },

  // ── Conteúdo ──────────────────────────────────────────────────────────────
  reels: {
    family: 'conteudo', label: 'Reels', icon: 'play',
    metrics: ['impressoes', 'cliques', 'visitantes'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
    taskRule: { titulo: 'Conferir métricas do Reels', prazoDias: 3 },
  },
  story: {
    family: 'conteudo', label: 'Story', icon: 'circulo',
    metrics: ['impressoes', 'cliques'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
    taskRule: { titulo: 'Conferir visualizações e cliques do Story', prazoDias: 2 },
  },
  post: {
    family: 'conteudo', label: 'Post', icon: 'imagem',
    metrics: ['impressoes', 'cliques'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
  },
  video: {
    family: 'conteudo', label: 'Vídeo', icon: 'play',
    metrics: ['impressoes', 'cliques'],
    volumeIn: 'impressoes', volumeOut: 'cliques',
  },
  vsl: {
    family: 'conteudo', label: 'VSL', icon: 'play',
    metrics: ['visitantes', 'leads'],
    volumeIn: 'visitantes', volumeOut: 'leads',
  },

  // ── Páginas ───────────────────────────────────────────────────────────────
  landing_page: {
    family: 'pagina', label: 'Landing Page', icon: 'pagina',
    metrics: ['visitantes', 'leads'],
    volumeIn: 'visitantes', volumeOut: 'leads',
    taskRule: { titulo: 'Conferir dados da Landing Page', prazoDias: 3 },
  },
  pagina_vendas: {
    family: 'pagina', label: 'Página de vendas', icon: 'pagina',
    metrics: ['visitantes', 'vendas', 'receita'],
    volumeIn: 'visitantes', volumeOut: 'vendas', temPreco: true,
    taskRule: { titulo: 'Conferir conversão da página de vendas', prazoDias: 3 },
  },
  checkout: {
    family: 'pagina', label: 'Checkout', icon: 'carrinho',
    metrics: ['visitantes', 'vendas', 'receita'],
    volumeIn: 'visitantes', volumeOut: 'vendas', temPreco: true,
    taskRule: { titulo: 'Conferir abandono de checkout', prazoDias: 3 },
  },
  formulario: {
    family: 'pagina', label: 'Formulário', icon: 'formulario',
    metrics: ['visitantes', 'leads'],
    volumeIn: 'visitantes', volumeOut: 'leads',
  },

  // ── Contato ───────────────────────────────────────────────────────────────
  whatsapp: {
    family: 'contato', label: 'WhatsApp', icon: 'chat',
    metrics: ['conversas', 'ativacoes', 'vendas'],
    volumeIn: 'conversas', volumeOut: 'ativacoes',
    taskRule: { titulo: 'Conferir conversas e respostas no WhatsApp', prazoDias: 2 },
  },
  dm: {
    family: 'contato', label: 'Direct / DM', icon: 'chat',
    metrics: ['conversas', 'ativacoes'],
    volumeIn: 'conversas', volumeOut: 'ativacoes',
  },
  email: {
    family: 'contato', label: 'E-mail', icon: 'email',
    metrics: ['leads', 'cliques'],
    volumeIn: 'leads', volumeOut: 'cliques',
  },
  ligacao: {
    family: 'contato', label: 'Ligação', icon: 'telefone',
    metrics: ['conversas', 'vendas'],
    volumeIn: 'conversas', volumeOut: 'vendas',
  },

  // ── Produto ───────────────────────────────────────────────────────────────
  cadastro: {
    family: 'produto', label: 'Cadastro', icon: 'pessoa',
    metrics: ['leads', 'ativacoes'],
    volumeIn: 'leads', volumeOut: 'ativacoes',
  },
  trial: {
    family: 'produto', label: 'Teste grátis', icon: 'relogio',
    metrics: ['ativacoes', 'vendas'],
    volumeIn: 'ativacoes', volumeOut: 'vendas',
    taskRule: { titulo: 'Conferir quantos trials ativaram', prazoDias: 7 },
  },
  ativacao: {
    family: 'produto', label: 'Ativação', icon: 'raio',
    metrics: ['ativacoes'],
    volumeIn: 'ativacoes', volumeOut: 'ativacoes',
  },
  assinatura: {
    family: 'produto', label: 'Assinatura', icon: 'estrela',
    metrics: ['vendas', 'receita'],
    volumeIn: 'vendas', volumeOut: 'vendas', temPreco: true,
    terminal: true,
    taskRule: { titulo: 'Conferir assinaturas e receita', prazoDias: 7 },
  },
  app: {
    family: 'produto', label: 'Aplicativo', icon: 'celular',
    metrics: ['ativacoes', 'vendas'],
    volumeIn: 'ativacoes', volumeOut: 'vendas',
  },

  /**
   * A etapa de oferta existe separada da página de vendas de propósito: a página
   * é onde a pessoa passa, a oferta é o que ela compra e por quanto. Separar
   * deixa o cálculo de receita direto e permite order bump / upsell no mesmo
   * funil, cada um com seu preço.
   */
  oferta: {
    family: 'produto', label: 'Oferta', icon: 'etiqueta',
    metrics: ['vendas', 'receita'],
    volumeIn: 'vendas', volumeOut: 'vendas', temPreco: true,
    taskRule: { titulo: 'Conferir vendas e receita da oferta', prazoDias: 7 },
  },

  // ── Outros ────────────────────────────────────────────────────────────────
  condicao: { family: 'outros', label: 'Condição', icon: 'condicao', metrics: [] },
  nota: { family: 'outros', label: 'Nota', icon: 'nota', metrics: [], terminal: true },
} as const satisfies Record<string, NodeTypeDef>

export type NodeType = keyof typeof NODE_TYPES

export const NODE_TYPE_LIST = Object.keys(NODE_TYPES) as NodeType[]

export function isNodeType(value: string): value is NodeType {
  return value in NODE_TYPES
}

const FALLBACK: NodeTypeDef = {
  family: 'outros',
  label: 'Etapa',
  icon: 'condicao',
  metrics: [],
}

/**
 * Tipo desconhecido (import antigo, dado torto no banco) devolve um fallback
 * em vez de undefined. Um tipo fora da taxonomia não pode derrubar o canvas.
 */
export function getNodeType(type: NodeType | string): NodeTypeDef {
  return (NODE_TYPES as Record<string, NodeTypeDef>)[type] ?? FALLBACK
}

export function typesByFamily(family: Family): NodeType[] {
  return NODE_TYPE_LIST.filter((t) => NODE_TYPES[t].family === family)
}

/** Etapas que não são de jornada — ficam fora de qualquer análise. */
export function isStructural(type: NodeType): boolean {
  return type === 'nota'
}
