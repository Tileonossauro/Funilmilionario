import { describe, it, expect } from 'vitest'
import {
  extractionResultSchema,
  camposParaRevisar,
  toMetricValues,
} from '@/domain/extraction/schema'

describe('extractionResultSchema', () => {
  it('aceita uma leitura válida', () => {
    const parsed = extractionResultSchema.safeParse({
      fonte: 'Instagram Insights',
      periodo: { de: '2026-09-01', ate: '2026-09-15' },
      metricas: {
        impressoes: { valor: 12400, confianca: 'alta', textoOriginal: '12,4 mil' },
        cliques: { valor: 310, confianca: 'media' },
      },
    })
    expect(parsed.success).toBe(true)
  })

  it('rejeita métrica fora da taxonomia', () => {
    const parsed = extractionResultSchema.safeParse({
      metricas: { curtidas: { valor: 10, confianca: 'alta' } },
    })
    expect(parsed.success).toBe(false)
  })

  it('rejeita valor negativo', () => {
    const parsed = extractionResultSchema.safeParse({
      metricas: { leads: { valor: -5, confianca: 'alta' } },
    })
    expect(parsed.success).toBe(false)
  })

  it('rejeita confiança inventada', () => {
    const parsed = extractionResultSchema.safeParse({
      metricas: { leads: { valor: 5, confianca: 'talvez' } },
    })
    expect(parsed.success).toBe(false)
  })
})

describe('conferência', () => {
  const result = {
    metricas: {
      impressoes: { valor: 12400, confianca: 'alta' as const },
      cliques: { valor: 310, confianca: 'baixa' as const },
      leads: { valor: 42, confianca: 'media' as const },
    },
  }

  it('destaca apenas os campos que não são de confiança alta', () => {
    expect(camposParaRevisar(result).sort()).toEqual(['cliques', 'leads'])
  })

  it('converte para valores planos', () => {
    expect(toMetricValues(result)).toEqual({ impressoes: 12400, cliques: 310, leads: 42 })
  })
})
