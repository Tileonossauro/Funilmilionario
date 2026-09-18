import { describe, it, expect } from 'vitest'
import { volumesDaEtapa, taxaDePassagem } from '@/domain/funnel/fluxo'

describe('volumesDaEtapa', () => {
  it('lê entrada e saída pelo tipo da etapa', () => {
    const v = volumesDaEtapa('landing_page', { visitantes: 1240, leads: 228 })
    expect(v.entrada).toBe(1240)
    expect(v.saida).toBe(228)
    expect(v.conversao).toBeCloseTo(0.1839, 3)
  })

  it('usa conversas e ativações no WhatsApp', () => {
    const v = volumesDaEtapa('whatsapp', { conversas: 228, ativacoes: 96 })
    expect(v.conversao).toBeCloseTo(0.4211, 3)
  })

  it('não inventa conversão quando entrada e saída são a mesma métrica', () => {
    const v = volumesDaEtapa('assinatura', { vendas: 30, receita: 897 })
    expect(v.entrada).toBe(30)
    expect(v.conversao).toBeUndefined()
  })

  it('devolve undefined em vez de dividir por zero', () => {
    expect(volumesDaEtapa('landing_page', { visitantes: 0, leads: 5 }).conversao).toBeUndefined()
  })

  it('não calcula conversão com só um dos lados preenchido', () => {
    expect(volumesDaEtapa('landing_page', { visitantes: 1240 }).conversao).toBeUndefined()
  })

  it('ignora métricas que não são volume da etapa', () => {
    const v = volumesDaEtapa('meta_ads', { investimento: 500, impressoes: 10000, cliques: 200 })
    expect(v.entrada).toBe(10000)
    expect(v.saida).toBe(200)
  })
})

describe('taxaDePassagem', () => {
  it('mede o vazamento entre duas etapas ligadas', () => {
    // A LP gerou 228 leads, mas só 180 viraram conversa: 21% somem no caminho.
    const taxa = taxaDePassagem(
      { type: 'landing_page', valores: { visitantes: 1240, leads: 228 } },
      { type: 'whatsapp', valores: { conversas: 180, ativacoes: 96 } },
    )
    expect(taxa).toBeCloseTo(0.7895, 3)
  })

  it('dá 100% quando todo mundo passa', () => {
    const taxa = taxaDePassagem(
      { type: 'landing_page', valores: { visitantes: 1240, leads: 228 } },
      { type: 'whatsapp', valores: { conversas: 228 } },
    )
    expect(taxa).toBe(1)
  })

  it('devolve undefined quando falta número de um dos lados', () => {
    expect(
      taxaDePassagem(
        { type: 'landing_page', valores: { visitantes: 1240 } },
        { type: 'whatsapp', valores: { conversas: 228 } },
      ),
    ).toBeUndefined()
  })

  it('não quebra quando a origem não teve saída', () => {
    expect(
      taxaDePassagem(
        { type: 'landing_page', valores: { visitantes: 100, leads: 0 } },
        { type: 'whatsapp', valores: { conversas: 0 } },
      ),
    ).toBeUndefined()
  })
})
