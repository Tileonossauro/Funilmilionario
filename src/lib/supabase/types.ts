/**
 * Tipos do banco escritos à mão, espelhando supabase/migrations/.
 * Quando o projeto Supabase existir, isto vira `supabase gen types typescript`.
 */

export type FunnelStatus = 'rascunho' | 'ativo' | 'pausado' | 'arquivado'

export type FunnelRow = {
  id: string
  owner_id: string
  nome: string
  descricao: string | null
  status: FunnelStatus
  viewport: { x: number; y: number; zoom: number }
  simulacao: Record<string, unknown> | null
  areas: unknown
  node_count: number
  created_at: string
  updated_at: string
}

export type FunnelNodeRow = {
  id: string
  funnel_id: string
  owner_id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type FunnelEdgeRow = {
  id: string
  funnel_id: string
  owner_id: string
  source_id: string
  target_id: string
  data: Record<string, unknown>
  created_at: string
}

export type MetricEntryRow = {
  id: string
  node_id: string
  funnel_id: string
  owner_id: string
  periodo_de: string
  periodo_ate: string
  valores: Record<string, number>
  origem: 'manual' | 'screenshot'
  screenshot_path: string | null
  observacao: string | null
  created_at: string
}

export type TaskRow = {
  id: string
  funnel_id: string
  node_id: string | null
  owner_id: string
  titulo: string
  vencimento: string
  status: 'aberta' | 'feita'
  origem: 'regra' | 'manual'
  created_at: string
  concluida_em: string | null
}

type Tabela<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] }

export type ProfileRow = {
  id: string
  email: string
  nome: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: Tabela<ProfileRow>
      funnels: Tabela<FunnelRow>
      funnel_nodes: Tabela<FunnelNodeRow>
      funnel_edges: Tabela<FunnelEdgeRow>
      metric_entries: Tabela<MetricEntryRow>
      tasks: Tabela<TaskRow>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: { funnel_status: FunnelStatus }
    CompositeTypes: Record<string, never>
  }
}
