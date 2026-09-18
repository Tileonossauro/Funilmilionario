import { z } from 'zod'
import { METRIC_KEYS, type MetricKey } from '@/domain/metrics/keys'

/**
 * Contrato da leitura de print. A IA devolve valor + confiança por campo.
 *
 * Campo que ela não achou vem ausente — nunca zero, nunca chute. Zero é um número
 * legítimo ("não tivemos vendas"); usar zero para dizer "não sei" faz o histórico
 * mentir de um jeito que ninguém percebe depois.
 */

const extractedFieldSchema = z.object({
  valor: z.number().nonnegative(),
  confianca: z.enum(['alta', 'media', 'baixa']),
  /** Como apareceu no print — deixa a conferência muito mais rápida. */
  textoOriginal: z.string().max(80).optional(),
})

export const extractionResultSchema = z.object({
  periodo: z
    .object({
      de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      textoOriginal: z.string().max(120).optional(),
    })
    .optional(),
  metricas: z.record(
    z.enum(METRIC_KEYS as unknown as [string, ...string[]]),
    extractedFieldSchema,
  ),
  /** O que a IA identificou como sendo a tela (Instagram Insights, Meta Ads...). */
  fonte: z.string().max(80).optional(),
  /** Preenchido quando ela não conseguiu ler nada de útil. */
  aviso: z.string().max(300).optional(),
})

export type ExtractedField = z.infer<typeof extractedFieldSchema>
export type ExtractionResult = z.infer<typeof extractionResultSchema>

/** Campos com confiança baixa entram na conferência já destacados. */
export function camposParaRevisar(result: ExtractionResult): MetricKey[] {
  return (Object.keys(result.metricas) as MetricKey[]).filter(
    (k) => result.metricas[k]?.confianca !== 'alta',
  )
}

export function toMetricValues(result: ExtractionResult): Partial<Record<MetricKey, number>> {
  const out: Partial<Record<MetricKey, number>> = {}
  for (const key of Object.keys(result.metricas) as MetricKey[]) {
    const field = result.metricas[key]
    if (field) out[key] = field.valor
  }
  return out
}
