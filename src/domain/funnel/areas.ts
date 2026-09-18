/**
 * Áreas do funil: Topo, Meio e Fundo (e o que mais o usuário quiser criar).
 *
 * São FAIXAS HORIZONTAIS, não retângulos soltos, e isso é proposital. Topo,
 * meio e fundo são uma sequência vertical, e o funil já desce na tela. Sendo
 * faixa, a etapa pertence à área pela própria posição: subiu o Reels, virou
 * Topo. Não existe "arrastar para dentro do grupo", nem etapa que ficou órfã
 * porque foi movida um pixel para fora da caixa.
 */

export const CORES_AREA = ['violeta', 'ambar', 'ceu', 'esmeralda', 'rosa', 'cinza'] as const
export type CorArea = (typeof CORES_AREA)[number]

export interface AreaFunil {
  id: string
  label: string
  cor: CorArea
  /** Altura da faixa em coordenadas do canvas. */
  altura: number
}

export const ALTURA_MINIMA = 160
export const Y_INICIAL = -80

export function areasPadrao(): AreaFunil[] {
  return [
    { id: 'topo', label: 'Topo', cor: 'violeta', altura: 420 },
    { id: 'meio', label: 'Meio', cor: 'ambar', altura: 420 },
    { id: 'fundo', label: 'Fundo', cor: 'esmeralda', altura: 420 },
  ]
}

export interface Faixa {
  area: AreaFunil
  inicio: number
  fim: number
}

/** Geometria das faixas, empilhadas de cima para baixo. Usada para desenhar. */
export function faixas(areas: AreaFunil[], inicioY: number = Y_INICIAL): Faixa[] {
  let y = inicioY
  return areas.map((area) => {
    const inicio = y
    y += Math.max(area.altura, ALTURA_MINIMA)
    return { area, inicio, fim: y }
  })
}

/**
 * Em que área uma etapa está, pela altura dela.
 *
 * As pontas são abertas de propósito: quem está acima da primeira faixa conta
 * como Topo, quem está abaixo da última conta como Fundo. Toda etapa pertence
 * a alguma área — "fora de todas" seria um estado que o usuário não pediu e
 * teria de entender.
 */
export function areaDaEtapa(
  areas: AreaFunil[],
  y: number,
  inicioY: number = Y_INICIAL,
): AreaFunil | undefined {
  if (areas.length === 0) return undefined

  const lista = faixas(areas, inicioY)
  const primeira = lista[0]!
  const ultima = lista[lista.length - 1]!

  if (y < primeira.inicio) return primeira.area
  if (y >= ultima.fim) return ultima.area

  return lista.find((f) => y >= f.inicio && y < f.fim)?.area
}

export interface ContagemArea {
  area: AreaFunil
  quantidade: number
}

/** Quantas etapas em cada área — é o que responde "quanto conteúdo tenho no topo?". */
export function contarPorArea(
  areas: AreaFunil[],
  etapas: { position: { y: number } }[],
  inicioY: number = Y_INICIAL,
): ContagemArea[] {
  const porId = new Map<string, number>(areas.map((a) => [a.id, 0]))

  for (const etapa of etapas) {
    const area = areaDaEtapa(areas, etapa.position.y, inicioY)
    if (area) porId.set(area.id, (porId.get(area.id) ?? 0) + 1)
  }

  return areas.map((area) => ({ area, quantidade: porId.get(area.id) ?? 0 }))
}

/** Altura total ocupada, para desenhar a moldura externa. */
export function alturaTotal(areas: AreaFunil[]): number {
  return areas.reduce((soma, a) => soma + Math.max(a.altura, ALTURA_MINIMA), 0)
}

/**
 * Redimensiona uma faixa arrastando a borda de baixo. A faixa seguinte cede o
 * espaço, para as de baixo não saírem andando pela tela a cada ajuste.
 */
export function redimensionar(
  areas: AreaFunil[],
  id: string,
  novaAltura: number,
): AreaFunil[] {
  const i = areas.findIndex((a) => a.id === id)
  if (i === -1) return areas

  const atual = areas[i]!
  const alvo = Math.max(novaAltura, ALTURA_MINIMA)
  const seguinte = areas[i + 1]

  if (!seguinte) {
    return areas.map((a) => (a.id === id ? { ...a, altura: alvo } : a))
  }

  // O que uma faixa ganha, a de baixo perde — respeitando o mínimo dela.
  const delta = alvo - atual.altura
  const alturaSeguinte = Math.max(seguinte.altura - delta, ALTURA_MINIMA)
  const deltaReal = seguinte.altura - alturaSeguinte

  return areas.map((a, idx) => {
    if (idx === i) return { ...a, altura: Math.max(atual.altura + deltaReal, ALTURA_MINIMA) }
    if (idx === i + 1) return { ...a, altura: alturaSeguinte }
    return a
  })
}
