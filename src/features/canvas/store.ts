'use client'

import { create } from 'zustand'
import type { NodeType } from '@/domain/funnel/taxonomy'
import { simular, type ResultadoSimulacao } from '@/domain/funnel/simulacao'

export interface CanvasNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  label: string
  objetivo?: string
  url?: string
  observacoes?: string
  ultimoLancamento?: Record<string, number>
  ultimoLancamentoEm?: string
  /** Preço unitário nas etapas onde o dinheiro entra. */
  preco?: number
  rev: number
}

export interface EstadoSimulacao {
  ativa: boolean
  entryNodeId: string | null
  volume: number
  investimento: number
  taxasNode: Record<string, number>
  taxasEdge: Record<string, number>
}

export const SIMULACAO_INICIAL: EstadoSimulacao = {
  ativa: false,
  entryNodeId: null,
  volume: 10000,
  investimento: 0,
  taxasNode: {},
  taxasEdge: {},
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
  label: string
}

export type SaveState = 'ocioso' | 'salvando' | 'salvo' | 'erro'

interface CanvasStore {
  funnelId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selecionado: string | null
  saveState: SaveState
  aviso: string | null
  simulacao: EstadoSimulacao

  iniciar: (
    funnelId: string,
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    simulacao?: Partial<EstadoSimulacao>,
  ) => void
  selecionar: (id: string | null) => void
  setSaveState: (s: SaveState) => void
  avisar: (msg: string | null) => void

  addNode: (node: CanvasNode) => void
  moveNode: (id: string, position: { x: number; y: number }) => void
  patchNode: (id: string, patch: Partial<Omit<CanvasNode, 'id' | 'rev'>>) => void
  removeNode: (id: string) => void

  addEdge: (edge: CanvasEdge) => void
  patchEdge: (id: string, label: string) => void
  removeEdge: (id: string) => void

  patchSimulacao: (patch: Partial<EstadoSimulacao>) => void
  setTaxaNode: (nodeId: string, taxa: number | null) => void
  setTaxaEdge: (edgeId: string, taxa: number | null) => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  funnelId: '',
  nodes: [],
  edges: [],
  selecionado: null,
  saveState: 'ocioso',
  aviso: null,

  simulacao: SIMULACAO_INICIAL,

  iniciar: (funnelId, nodes, edges, simulacao) =>
    set({
      funnelId,
      nodes,
      edges,
      selecionado: null,
      saveState: 'ocioso',
      // A entrada começa na etapa sem ninguém apontando para ela — quase sempre
      // é o topo do funil, e poupa o usuário de escolher antes de ver qualquer coisa.
      simulacao: {
        ...SIMULACAO_INICIAL,
        ...simulacao,
        entryNodeId: simulacao?.entryNodeId ?? inferirEntrada(nodes, edges),
      },
    }),

  selecionar: (id) => set({ selecionado: id }),
  setSaveState: (saveState) => set({ saveState }),
  avisar: (aviso) => set({ aviso }),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node], selecionado: node.id })),

  moveNode: (id, position) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, position, rev: n.rev + 1 } : n)),
    })),

  patchNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch, rev: n.rev + 1 } : n)),
    })),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      // Aresta órfã no canvas vira linha para lugar nenhum. Some junto.
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selecionado: s.selecionado === id ? null : s.selecionado,
      simulacao: {
        ...s.simulacao,
        entryNodeId: s.simulacao.entryNodeId === id ? null : s.simulacao.entryNodeId,
        taxasNode: semChave(s.simulacao.taxasNode, id),
      },
    })),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  patchEdge: (id, label) =>
    set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, label } : e)) })),

  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      simulacao: { ...s.simulacao, taxasEdge: semChave(s.simulacao.taxasEdge, id) },
    })),

  patchSimulacao: (patch) => set((s) => ({ simulacao: { ...s.simulacao, ...patch } })),

  setTaxaNode: (nodeId, taxa) =>
    set((s) => ({
      simulacao: {
        ...s.simulacao,
        taxasNode:
          taxa === null
            ? semChave(s.simulacao.taxasNode, nodeId)
            : { ...s.simulacao.taxasNode, [nodeId]: taxa },
      },
    })),

  setTaxaEdge: (edgeId, taxa) =>
    set((s) => ({
      simulacao: {
        ...s.simulacao,
        taxasEdge:
          taxa === null
            ? semChave(s.simulacao.taxasEdge, edgeId)
            : { ...s.simulacao.taxasEdge, [edgeId]: taxa },
      },
    })),
}))

function semChave(mapa: Record<string, number>, chave: string): Record<string, number> {
  const { [chave]: _removido, ...resto } = mapa
  return resto
}

/** Etapa que ninguém aponta: o topo do funil. */
function inferirEntrada(nodes: CanvasNode[], edges: CanvasEdge[]): string | null {
  const comEntrada = new Set(edges.map((e) => e.target))
  return nodes.find((n) => !comEntrada.has(n.id))?.id ?? nodes[0]?.id ?? null
}

/**
 * Resultado da projeção. Fica fora do store porque é derivado — guardar
 * resultado calculado no estado é como ele fica desatualizado sem ninguém ver.
 */
export function calcularSimulacao(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  simulacao: EstadoSimulacao,
): ResultadoSimulacao | null {
  if (!simulacao.ativa || !simulacao.entryNodeId) return null

  return simular(
    nodes.map((n) => ({
      id: n.id,
      type: n.type,
      valores: n.ultimoLancamento ?? {},
      preco: n.preco,
    })),
    edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    {
      entryNodeId: simulacao.entryNodeId,
      volume: simulacao.volume,
      investimento: simulacao.investimento,
      taxasNode: simulacao.taxasNode,
      taxasEdge: simulacao.taxasEdge,
    },
  )
}
