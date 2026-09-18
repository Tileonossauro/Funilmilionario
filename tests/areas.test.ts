import { describe, it, expect } from 'vitest'
import {
  areasPadrao,
  faixas,
  areaDaEtapa,
  contarPorArea,
  redimensionar,
  alturaTotal,
  ALTURA_MINIMA,
  Y_INICIAL,
  type AreaFunil,
} from '@/domain/funnel/areas'

const padrao = areasPadrao()

describe('faixas', () => {
  it('empilha as áreas de cima para baixo sem buraco nem sobreposição', () => {
    const lista = faixas(padrao)
    expect(lista[0]!.inicio).toBe(Y_INICIAL)
    expect(lista[0]!.fim).toBe(lista[1]!.inicio)
    expect(lista[1]!.fim).toBe(lista[2]!.inicio)
  })

  it('respeita a altura mínima mesmo se alguém gravar um valor menor', () => {
    const espremida: AreaFunil[] = [{ id: 'a', label: 'A', cor: 'cinza', altura: 10 }]
    const [faixa] = faixas(espremida)
    expect(faixa!.fim - faixa!.inicio).toBe(ALTURA_MINIMA)
  })
})

describe('areaDaEtapa', () => {
  it('encontra a área pela altura da etapa', () => {
    const lista = faixas(padrao)
    expect(areaDaEtapa(padrao, lista[0]!.inicio + 10)?.id).toBe('topo')
    expect(areaDaEtapa(padrao, lista[1]!.inicio + 10)?.id).toBe('meio')
    expect(areaDaEtapa(padrao, lista[2]!.inicio + 10)?.id).toBe('fundo')
  })

  it('a borda pertence à faixa de baixo, sem ambiguidade', () => {
    const lista = faixas(padrao)
    expect(areaDaEtapa(padrao, lista[0]!.fim)?.id).toBe('meio')
  })

  it('etapa acima de tudo conta como a primeira área', () => {
    expect(areaDaEtapa(padrao, -99999)?.id).toBe('topo')
  })

  it('etapa abaixo de tudo conta como a última área', () => {
    expect(areaDaEtapa(padrao, 99999)?.id).toBe('fundo')
  })

  it('sem áreas definidas não inventa nenhuma', () => {
    expect(areaDaEtapa([], 100)).toBeUndefined()
  })
})

describe('contarPorArea', () => {
  it('conta quantas etapas caem em cada área', () => {
    const lista = faixas(padrao)
    const etapas = [
      { position: { y: lista[0]!.inicio + 10 } },
      { position: { y: lista[0]!.inicio + 50 } },
      { position: { y: lista[2]!.inicio + 10 } },
    ]
    const contagem = contarPorArea(padrao, etapas)
    expect(contagem.map((c) => c.quantidade)).toEqual([2, 0, 1])
  })

  it('devolve zero para área vazia em vez de omitir a área', () => {
    expect(contarPorArea(padrao, []).map((c) => c.quantidade)).toEqual([0, 0, 0])
  })
})

describe('redimensionar', () => {
  it('o que uma faixa ganha, a de baixo perde — as outras não se mexem', () => {
    const antes = alturaTotal(padrao)
    const depois = redimensionar(padrao, 'topo', 520)
    expect(depois[0]!.altura).toBe(520)
    expect(depois[1]!.altura).toBe(320)
    expect(depois[2]!.altura).toBe(padrao[2]!.altura)
    expect(alturaTotal(depois)).toBe(antes)
  })

  it('não deixa a faixa de baixo sumir: para no mínimo', () => {
    const depois = redimensionar(padrao, 'topo', 5000)
    expect(depois[1]!.altura).toBe(ALTURA_MINIMA)
    // o topo só cresce o quanto a de baixo pôde ceder
    expect(depois[0]!.altura).toBe(padrao[0]!.altura + (padrao[1]!.altura - ALTURA_MINIMA))
  })

  it('respeita o mínimo da própria faixa', () => {
    expect(redimensionar(padrao, 'topo', 10)[0]!.altura).toBe(ALTURA_MINIMA)
  })

  it('a última faixa cresce livre, já que não há ninguém abaixo', () => {
    expect(redimensionar(padrao, 'fundo', 900)[2]!.altura).toBe(900)
  })

  it('id desconhecido não altera nada', () => {
    expect(redimensionar(padrao, 'inexistente', 900)).toEqual(padrao)
  })
})
