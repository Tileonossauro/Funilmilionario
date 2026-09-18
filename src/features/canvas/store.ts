'use client'

import { create } from 'zustand'
import type { NodeType } from '@/domain/funnel/taxonomy'

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
  rev: number
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

  iniciar: (funnelId: string, nodes: CanvasNode[], edges: CanvasEdge[]) => void
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
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  funnelId: '',
  nodes: [],
  edges: [],
  selecionado: null,
  saveState: 'ocioso',
  aviso: null,

  iniciar: (funnelId, nodes, edges) =>
    set({ funnelId, nodes, edges, selecionado: null, saveState: 'ocioso' }),

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
    })),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  patchEdge: (id, label) =>
    set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, label } : e)) })),

  removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),
}))
