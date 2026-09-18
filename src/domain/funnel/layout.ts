export interface PosicaoNode {
  x: number
  y: number
}

const DISTANCIA_VERTICAL = 150
const DEGRAU = 28
const DEGRAUS_ANTES_DE_REPETIR = 8

/**
 * Onde cai a próxima etapa adicionada pela biblioteca.
 *
 * Com uma etapa selecionada, a nova entra logo abaixo dela: é assim que se
 * monta um funil, de cima para baixo, clicando uma etapa atrás da outra.
 *
 * Sem seleção, vai para o ponto de referência da área visível, com um degrau
 * por etapa já existente — senão clicar cinco vezes empilha cinco cartões
 * exatamente no mesmo lugar e parece que só uma foi criada.
 */
export function proximaPosicao(
  quantidadeDeEtapas: number,
  referencia: PosicaoNode,
  etapaSelecionada?: PosicaoNode,
): PosicaoNode {
  if (etapaSelecionada) {
    return { x: etapaSelecionada.x, y: etapaSelecionada.y + DISTANCIA_VERTICAL }
  }

  const degrau = (quantidadeDeEtapas % DEGRAUS_ANTES_DE_REPETIR) * DEGRAU
  return { x: referencia.x + degrau, y: referencia.y + degrau }
}
