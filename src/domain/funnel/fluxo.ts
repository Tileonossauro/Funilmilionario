import { getNodeType, type NodeType } from '@/domain/funnel/taxonomy'
import { ratio, type MetricKey } from '@/domain/metrics/keys'

/**
 * Leitura do funil como funil, não como diagrama.
 *
 * Duas perguntas diferentes, que muita ferramenta mistura num número só:
 *
 * 1. Quanto essa ETAPA converte?          saida / entrada     (dentro da etapa)
 * 2. Quanto passa de uma etapa PRA OUTRA?  entrada(destino) / saida(origem)
 *
 * A segunda é a que revela vazamento entre etapas: a LP gerou 228 leads mas só
 * 180 viraram conversa no WhatsApp — 48 pessoas somem no caminho, e isso não
 * aparece olhando nenhuma das duas etapas isoladamente.
 */

export interface VolumesEtapa {
  entrada?: number
  saida?: number
  conversao?: number
}

export type ValoresEtapa = Partial<Record<MetricKey, number>>

export function volumesDaEtapa(type: NodeType, valores: ValoresEtapa): VolumesEtapa {
  const def = getNodeType(type)
  const entrada = def.volumeIn ? valores[def.volumeIn] : undefined
  const saida = def.volumeOut ? valores[def.volumeOut] : undefined

  // Etapas cujo volumeIn e volumeOut são a mesma métrica (ativação, assinatura)
  // não têm conversão interna — seria sempre 100% e só poluiria a tela.
  const temConversao = def.volumeIn !== undefined && def.volumeOut !== def.volumeIn

  return {
    entrada,
    saida,
    conversao: temConversao ? ratio(saida, entrada) : undefined,
  }
}

/**
 * Taxa de passagem entre duas etapas ligadas.
 * `undefined` quando falta número dos dois lados — melhor não mostrar nada do
 * que mostrar uma porcentagem que ninguém consegue justificar.
 */
export function taxaDePassagem(
  origem: { type: NodeType; valores: ValoresEtapa },
  destino: { type: NodeType; valores: ValoresEtapa },
): number | undefined {
  const saida = volumesDaEtapa(origem.type, origem.valores).saida
  const entrada = volumesDaEtapa(destino.type, destino.valores).entrada
  return ratio(entrada, saida)
}
