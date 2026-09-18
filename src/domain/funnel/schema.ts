import { z } from 'zod'
import { METRIC_KEYS } from '@/domain/metrics/keys'
import { NODE_TYPE_LIST } from '@/domain/funnel/taxonomy'

const nodeTypeEnum = z.enum(NODE_TYPE_LIST as [string, ...string[]])
const metricKeyEnum = z.enum(METRIC_KEYS as unknown as [string, ...string[]])

export const positionSchema = z.object({ x: z.number(), y: z.number() })

export const metricValuesSchema = z.record(metricKeyEnum, z.number().nonnegative())

export const nodeDataSchema = z.object({
  label: z.string().min(1).max(120),
  objetivo: z.string().max(500).optional(),
  url: z.string().url().optional().or(z.literal('')),
  observacoes: z.string().max(2000).optional(),
  /** Último lançamento, espelhado aqui só para o canvas renderizar sem N queries. */
  ultimoLancamento: metricValuesSchema.optional(),
  ultimoLancamentoEm: z.string().optional(),
  /** Muda a cada mutação — chave barata para React.memo. */
  rev: z.number().int().nonnegative(),
})

export const funnelNodeSchema = z.object({
  id: z.string().uuid(),
  type: nodeTypeEnum,
  position: positionSchema,
  data: nodeDataSchema,
})

export const edgeDataSchema = z.object({
  label: z.string().max(80).optional(),
  rev: z.number().int().nonnegative(),
})

export const funnelEdgeSchema = z.object({
  id: z.string().uuid(),
  source: z.string().uuid(),
  target: z.string().uuid(),
  data: edgeDataSchema,
})

export const funnelGraphSchema = z.object({
  schemaVersion: z.literal(1),
  nodes: z.array(funnelNodeSchema),
  edges: z.array(funnelEdgeSchema),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
})

export type FunnelNodeData = z.infer<typeof nodeDataSchema>
export type FunnelEdgeData = z.infer<typeof edgeDataSchema>
export type FunnelGraph = z.infer<typeof funnelGraphSchema>

export interface FunnelNode {
  id: string
  type: import('@/domain/funnel/taxonomy').NodeType
  position: { x: number; y: number }
  data: FunnelNodeData
}

export interface FunnelEdge {
  id: string
  source: string
  target: string
  data: FunnelEdgeData
}
