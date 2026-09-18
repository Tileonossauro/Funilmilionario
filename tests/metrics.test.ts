import { describe, it, expect } from 'vitest'
import { computeDerived, formatMetric } from '@/domain/metrics/keys'

describe('computeDerived', () => {
  it('calcula CTR a partir de cliques e impressões', () => {
    expect(computeDerived({ impressoes: 1000, cliques: 20 }).ctr).toBeCloseTo(0.02)
  })

  it('calcula CPL, CAC e ticket', () => {
    const d = computeDerived({ investimento: 1000, leads: 50, vendas: 10, receita: 299 })
    expect(d.cpl).toBe(20)
    expect(d.cac).toBe(100)
    expect(d.ticket).toBeCloseTo(29.9)
  })

  it('não devolve Infinity nem NaN quando o denominador é zero', () => {
    const d = computeDerived({ investimento: 500, leads: 0, impressoes: 0, cliques: 0 })
    expect(d.cpl).toBeUndefined()
    expect(d.ctr).toBeUndefined()
  })

  it('ignora métrica ausente em vez de tratar como zero', () => {
    expect(computeDerived({ cliques: 20 }).ctr).toBeUndefined()
  })
})

describe('formatMetric', () => {
  it('formata moeda em BRL', () => {
    expect(formatMetric(29.9, 'moeda')).toContain('29,90')
  })
  it('formata percentual com uma casa', () => {
    expect(formatMetric(0.1839, 'percentual')).toBe('18,4%')
  })
  it('formata inteiro com separador de milhar', () => {
    expect(formatMetric(1240, 'inteiro')).toBe('1.240')
  })
})
