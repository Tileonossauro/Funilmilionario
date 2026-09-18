import { describe, it, expect } from 'vitest'
import { proximaPosicao } from '@/domain/funnel/layout'

describe('proximaPosicao', () => {
  it('coloca a nova etapa abaixo da selecionada', () => {
    const p = proximaPosicao(3, { x: 0, y: 0 }, { x: 240, y: 100 })
    expect(p).toEqual({ x: 240, y: 250 })
  })

  it('mantém o alinhamento vertical ao encadear etapas', () => {
    let atual = { x: 240, y: 100 }
    for (let i = 0; i < 3; i++) atual = proximaPosicao(i, { x: 0, y: 0 }, atual)
    expect(atual.x).toBe(240)
    expect(atual.y).toBe(550)
  })

  it('usa a referência da tela quando não há seleção', () => {
    expect(proximaPosicao(0, { x: 500, y: 300 })).toEqual({ x: 500, y: 300 })
  })

  it('escalona para não empilhar duas etapas no mesmo ponto', () => {
    const a = proximaPosicao(0, { x: 500, y: 300 })
    const b = proximaPosicao(1, { x: 500, y: 300 })
    const c = proximaPosicao(2, { x: 500, y: 300 })
    expect(a).not.toEqual(b)
    expect(b).not.toEqual(c)
    expect(b.x).toBeGreaterThan(a.x)
  })

  it('volta ao início do degrau em vez de fugir da tela em funis grandes', () => {
    const p = proximaPosicao(8, { x: 500, y: 300 })
    expect(p).toEqual({ x: 500, y: 300 })
    expect(proximaPosicao(200, { x: 500, y: 300 }).x).toBeLessThan(500 + 8 * 28)
  })
})
