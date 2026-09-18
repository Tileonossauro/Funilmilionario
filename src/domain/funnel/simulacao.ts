import { taxaDePassagem, volumesDaEtapa, type ValoresEtapa } from '@/domain/funnel/fluxo'
import type { NodeType } from '@/domain/funnel/taxonomy'

/**
 * Projeção do funil antes de gastar: entra tráfego de um lado, sai receita do outro.
 *
 * Duas decisões que definem o resto:
 *
 * 1. As taxas começam nos SEUS números reais. Se a sua LP converte 18,4% de
 *    verdade, a projeção parte de 18,4% — não de um número redondo inventado.
 *    Projeção que ignora o histórico é chute com aparência de planilha.
 *
 * 2. Quando o sistema precisa adivinhar, ele avisa. Ramificação sem taxa
 *    definida divide igual entre as saídas e registra isso em `avisos`. O número
 *    continua aparecendo, mas você sabe qual parte dele é sua e qual é palpite.
 */

export interface NodeSimulacao {
  id: string
  type: NodeType
  valores: ValoresEtapa
  /** Preço unitário, quando a etapa é onde o dinheiro entra. */
  preco?: number
}

export interface EdgeSimulacao {
  id: string
  source: string
  target: string
}

export interface EntradaSimulacao {
  entryNodeId: string
  /** Pessoas entrando no topo. */
  volume: number
  investimento?: number
  /** Sobrescritas do usuário, 0..1. Sem entrada aqui, usa o número real. */
  taxasNode?: Record<string, number>
  taxasEdge?: Record<string, number>
}

export interface FluxoNode {
  entrada: number
  saida: number
  receita: number
  taxa: number
  taxaEstimada: boolean
}

export interface ResultadoSimulacao {
  porNode: Record<string, FluxoNode>
  porEdge: Record<string, { fluxo: number; taxa: number; taxaEstimada: boolean }>
  totais: {
    entrada: number
    vendas: number
    receita: number
    investimento: number
    lucro: number
    cac?: number
    roas?: number
  }
  avisos: string[]
}

const LIMITE_CICLO = 1000

export function simular(
  nodes: NodeSimulacao[],
  edges: EdgeSimulacao[],
  entrada: EntradaSimulacao,
): ResultadoSimulacao {
  const avisos: string[] = []
  const porId = new Map(nodes.map((n) => [n.id, n]))
  const saindoDe = new Map<string, EdgeSimulacao[]>()
  const grauEntrada = new Map<string, number>()

  for (const node of nodes) {
    saindoDe.set(node.id, [])
    grauEntrada.set(node.id, 0)
  }
  for (const edge of edges) {
    if (!porId.has(edge.source) || !porId.has(edge.target)) continue
    saindoDe.get(edge.source)!.push(edge)
    grauEntrada.set(edge.target, (grauEntrada.get(edge.target) ?? 0) + 1)
  }

  // ── taxa de cada etapa: sobrescrita do usuário > número real > 100% ──
  function taxaDoNode(node: NodeSimulacao): { taxa: number; estimada: boolean } {
    const manual = entrada.taxasNode?.[node.id]
    if (manual !== undefined) return { taxa: clamp(manual), estimada: false }

    const real = volumesDaEtapa(node.type, node.valores).conversao
    if (real !== undefined) return { taxa: clamp(real), estimada: false }

    return { taxa: 1, estimada: true }
  }

  function taxaDaEdge(
    edge: EdgeSimulacao,
    irmas: number,
  ): { taxa: number; estimada: boolean } {
    const manual = entrada.taxasEdge?.[edge.id]
    if (manual !== undefined) return { taxa: clamp(manual), estimada: false }

    const origem = porId.get(edge.source)
    const destino = porId.get(edge.target)
    if (origem && destino) {
      const real = taxaDePassagem(
        { type: origem.type, valores: origem.valores },
        { type: destino.type, valores: destino.valores },
      )
      if (real !== undefined) return { taxa: clamp(real), estimada: false }
    }

    // Sem número dos dois lados: caminho único passa tudo, ramificação divide igual.
    return { taxa: 1 / irmas, estimada: irmas > 1 }
  }

  // ── propagação em largura a partir da entrada ──
  const porNode: Record<string, FluxoNode> = {}
  const porEdge: ResultadoSimulacao['porEdge'] = {}
  const acumuladoEntrada = new Map<string, number>()
  const pendentes = new Map<string, number>()

  for (const node of nodes) {
    const alcancavel = grauEntrada.get(node.id) ?? 0
    pendentes.set(node.id, alcancavel)
  }

  if (!porId.has(entrada.entryNodeId)) {
    return {
      porNode: {},
      porEdge: {},
      totais: { entrada: 0, vendas: 0, receita: 0, investimento: 0, lucro: 0 },
      avisos: ['Escolha por qual etapa o tráfego entra.'],
    }
  }

  acumuladoEntrada.set(entrada.entryNodeId, entrada.volume)
  const fila: string[] = [entrada.entryNodeId]
  const processados = new Set<string>()
  let voltas = 0

  while (fila.length > 0) {
    if (++voltas > LIMITE_CICLO) {
      avisos.push('O funil tem um ciclo — a projeção parou para não rodar sem fim.')
      break
    }

    const id = fila.shift()!
    if (processados.has(id)) continue
    const node = porId.get(id)
    if (!node) continue
    processados.add(id)

    const chegou = acumuladoEntrada.get(id) ?? 0
    const { taxa, estimada } = taxaDoNode(node)
    const saiu = chegou * taxa
    const receita = node.preco !== undefined ? saiu * node.preco : 0

    porNode[id] = { entrada: chegou, saida: saiu, receita, taxa, taxaEstimada: estimada }

    const saidas = saindoDe.get(id) ?? []
    let somaTaxas = 0

    for (const edge of saidas) {
      const t = taxaDaEdge(edge, saidas.length)
      somaTaxas += t.taxa
      const fluxo = saiu * t.taxa
      porEdge[edge.id] = { fluxo, taxa: t.taxa, taxaEstimada: t.estimada }

      acumuladoEntrada.set(edge.target, (acumuladoEntrada.get(edge.target) ?? 0) + fluxo)

      // Só avança quando todas as entradas do destino já foram somadas — senão
      // uma etapa com duas origens seria calculada com metade do volume.
      const restante = (pendentes.get(edge.target) ?? 1) - 1
      pendentes.set(edge.target, restante)
      if (restante <= 0 && !processados.has(edge.target)) fila.push(edge.target)
    }

    if (somaTaxas > 1.001) {
      avisos.push(
        `"${node.id}" está mandando ${Math.round(somaTaxas * 100)}% das pessoas adiante — as saídas somam mais de 100%.`,
      )
    }
  }

  const naoAlcancados = nodes.filter((n) => !processados.has(n.id)).length
  if (naoAlcancados > 0) {
    avisos.push(
      `${naoAlcancados} ${naoAlcancados === 1 ? 'etapa não é alcançada' : 'etapas não são alcançadas'} a partir da entrada escolhida.`,
    )
  }
  if (Object.values(porNode).some((f) => f.taxaEstimada)) {
    avisos.push('Algumas taxas foram estimadas por falta de número — ajuste no painel.')
  }

  const investimento = entrada.investimento ?? 0
  const receita = Object.values(porNode).reduce((soma, f) => soma + f.receita, 0)
  const vendas = nodes
    .filter((n) => n.preco !== undefined)
    .reduce((soma, n) => soma + (porNode[n.id]?.saida ?? 0), 0)

  return {
    porNode,
    porEdge,
    totais: {
      entrada: entrada.volume,
      vendas,
      receita,
      investimento,
      lucro: receita - investimento,
      cac: vendas > 0 && investimento > 0 ? investimento / vendas : undefined,
      roas: investimento > 0 ? receita / investimento : undefined,
    },
    avisos: [...new Set(avisos)],
  }
}

function clamp(valor: number): number {
  if (!Number.isFinite(valor) || valor < 0) return 0
  return Math.min(valor, 1)
}
