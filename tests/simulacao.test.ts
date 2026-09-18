import { describe, it, expect } from 'vitest'
import { simular, type NodeSimulacao, type EdgeSimulacao } from '@/domain/funnel/simulacao'

// Funil linear: Meta Ads → LP → WhatsApp → Oferta
const linear: NodeSimulacao[] = [
  { id: 'ads', type: 'meta_ads', valores: { impressoes: 10000, cliques: 200 } },
  { id: 'lp', type: 'landing_page', valores: { visitantes: 200, leads: 40 } },
  { id: 'wpp', type: 'whatsapp', valores: { conversas: 40, ativacoes: 12 } },
  { id: 'oferta', type: 'oferta', valores: {}, preco: 29.9 },
]
const ligacoes: EdgeSimulacao[] = [
  { id: 'e1', source: 'ads', target: 'lp' },
  { id: 'e2', source: 'lp', target: 'wpp' },
  { id: 'e3', source: 'wpp', target: 'oferta' },
]

describe('simular — funil linear', () => {
  it('parte das taxas reais quando o usuário não sobrescreve nada', () => {
    const r = simular(linear, ligacoes, { entryNodeId: 'ads', volume: 100000 })

    // CTR real do anúncio = 200/10000 = 2%
    expect(r.porNode.ads!.saida).toBeCloseTo(2000)
    // LP converte 40/200 = 20%
    expect(r.porNode.lp!.entrada).toBeCloseTo(2000)
    expect(r.porNode.lp!.saida).toBeCloseTo(400)
    // WhatsApp converte 12/40 = 30%
    expect(r.porNode.wpp!.saida).toBeCloseTo(120)
    expect(r.porNode.oferta!.receita).toBeCloseTo(120 * 29.9)
  })

  it('respeita a taxa que o usuário sobrescreve', () => {
    const r = simular(linear, ligacoes, {
      entryNodeId: 'ads',
      volume: 100000,
      taxasNode: { lp: 0.3 },
    })
    expect(r.porNode.lp!.saida).toBeCloseTo(600)
    expect(r.porNode.lp!.taxaEstimada).toBe(false)
  })

  it('calcula CAC, ROAS e lucro', () => {
    const r = simular(linear, ligacoes, {
      entryNodeId: 'ads',
      volume: 100000,
      investimento: 1000,
    })
    expect(r.totais.vendas).toBeCloseTo(120)
    expect(r.totais.receita).toBeCloseTo(3588)
    expect(r.totais.lucro).toBeCloseTo(2588)
    expect(r.totais.cac).toBeCloseTo(1000 / 120)
    expect(r.totais.roas).toBeCloseTo(3.588)
  })

  it('não devolve CAC quando não houve investimento', () => {
    const r = simular(linear, ligacoes, { entryNodeId: 'ads', volume: 1000 })
    expect(r.totais.cac).toBeUndefined()
    expect(r.totais.roas).toBeUndefined()
  })
})

describe('simular — ramificação', () => {
  const nodes: NodeSimulacao[] = [
    { id: 'lp', type: 'landing_page', valores: { visitantes: 100, leads: 50 } },
    { id: 'sim', type: 'whatsapp', valores: {} },
    { id: 'nao', type: 'email', valores: {} },
  ]
  const edges: EdgeSimulacao[] = [
    { id: 'e-sim', source: 'lp', target: 'sim' },
    { id: 'e-nao', source: 'lp', target: 'nao' },
  ]

  it('divide igual entre as saídas quando não há taxa e avisa que estimou', () => {
    const r = simular(nodes, edges, { entryNodeId: 'lp', volume: 100 })
    expect(r.porNode.sim!.entrada).toBeCloseTo(25)
    expect(r.porNode.nao!.entrada).toBeCloseTo(25)
    expect(r.porEdge['e-sim']!.taxaEstimada).toBe(true)
    expect(r.avisos.some((a) => a.includes('estimadas'))).toBe(true)
  })

  it('usa as taxas informadas na ramificação', () => {
    const r = simular(nodes, edges, {
      entryNodeId: 'lp',
      volume: 100,
      taxasEdge: { 'e-sim': 0.8, 'e-nao': 0.2 },
    })
    expect(r.porNode.sim!.entrada).toBeCloseTo(40)
    expect(r.porNode.nao!.entrada).toBeCloseTo(10)
  })

  it('avisa quando as saídas somam mais de 100% das pessoas', () => {
    const r = simular(nodes, edges, {
      entryNodeId: 'lp',
      volume: 100,
      taxasEdge: { 'e-sim': 0.8, 'e-nao': 0.5 },
    })
    expect(r.avisos.some((a) => a.includes('somam mais de 100%'))).toBe(true)
  })
})

describe('simular — casos difíceis', () => {
  it('soma as duas origens antes de calcular uma etapa que recebe de dois lugares', () => {
    const nodes: NodeSimulacao[] = [
      { id: 'a', type: 'instagram', valores: {} },
      { id: 'b', type: 'reels', valores: {} },
      { id: 'junta', type: 'landing_page', valores: { visitantes: 10, leads: 5 } },
    ]
    const edges: EdgeSimulacao[] = [
      { id: 'e1', source: 'a', target: 'junta' },
      { id: 'e2', source: 'a', target: 'b' },
      { id: 'e3', source: 'b', target: 'junta' },
    ]
    const r = simular(nodes, edges, { entryNodeId: 'a', volume: 100 })
    // a divide 50/50; o ramo por b chega inteiro. A LP recebe os dois caminhos.
    expect(r.porNode.junta!.entrada).toBeCloseTo(100)
    expect(r.porNode.junta!.saida).toBeCloseTo(50)
  })

  it('não trava em ciclo', () => {
    const nodes: NodeSimulacao[] = [
      { id: 'a', type: 'whatsapp', valores: {} },
      { id: 'b', type: 'email', valores: {} },
    ]
    const edges: EdgeSimulacao[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'a' },
    ]
    const r = simular(nodes, edges, { entryNodeId: 'a', volume: 100 })
    expect(r.porNode.a).toBeDefined()
  })

  it('avisa sobre etapas que a entrada escolhida não alcança', () => {
    const nodes: NodeSimulacao[] = [
      { id: 'a', type: 'instagram', valores: {} },
      { id: 'solto', type: 'landing_page', valores: {} },
    ]
    const r = simular(nodes, [], { entryNodeId: 'a', volume: 100 })
    expect(r.avisos.some((a) => a.includes('não são alcançadas') || a.includes('não é alcançada'))).toBe(true)
  })

  it('pede a etapa de entrada quando ela não existe', () => {
    const r = simular(linear, ligacoes, { entryNodeId: 'inexistente', volume: 100 })
    expect(r.avisos[0]).toContain('entra')
    expect(r.totais.receita).toBe(0)
  })

  it('trata taxa absurda sem estourar', () => {
    const r = simular(linear, ligacoes, {
      entryNodeId: 'ads',
      volume: 100,
      taxasNode: { ads: 5, lp: -2 },
    })
    expect(r.porNode.ads!.saida).toBeCloseTo(100)
    expect(r.porNode.lp!.saida).toBe(0)
  })
})
