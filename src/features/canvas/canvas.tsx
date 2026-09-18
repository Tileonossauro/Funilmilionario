'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import { useCanvasStore, type CanvasNode, type CanvasEdge } from '@/features/canvas/store'
import { EtapaNode } from '@/features/canvas/etapa-node'
import { getNodeType, isNodeType, type NodeType } from '@/domain/funnel/taxonomy'
import {
  atualizarNode,
  criarNode,
  criarEdge,
  excluirEdge,
  excluirNode,
  salvarViewport,
} from '@/app/funis/actions'

const nodeTypes = { etapa: EtapaNode }

export function Canvas({ funnelId }: { funnelId: string }) {
  return (
    <ReactFlowProvider>
      <CanvasInterno funnelId={funnelId} />
    </ReactFlowProvider>
  )
}

function CanvasInterno({ funnelId }: { funnelId: string }) {
  const wrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [pronto, setPronto] = useState(false)

  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const selecionado = useCanvasStore((s) => s.selecionado)
  const selecionar = useCanvasStore((s) => s.selecionar)
  const addNode = useCanvasStore((s) => s.addNode)
  const moveNode = useCanvasStore((s) => s.moveNode)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const addEdge = useCanvasStore((s) => s.addEdge)
  const removeEdge = useCanvasStore((s) => s.removeEdge)
  const setSaveState = useCanvasStore((s) => s.setSaveState)
  const avisar = useCanvasStore((s) => s.avisar)

  useEffect(() => setPronto(true), [])

  const rfNodes = useMemo<Node[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: 'etapa',
        position: n.position,
        selected: n.id === selecionado,
        data: {
          label: n.label,
          etapaTipo: n.type,
          ultimoLancamento: n.ultimoLancamento,
          ultimoLancamentoEm: n.ultimoLancamentoEm,
          rev: n.rev,
        },
      })),
    [nodes, selecionado],
  )

  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label || undefined,
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed' as const },
      })),
    [edges],
  )

  /** Só o fim do arraste vai ao banco — durante o drag seria uma escrita por frame. */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          moveNode(change.id, change.position)
          if (!change.dragging) {
            setSaveState('salvando')
            void atualizarNode(change.id, { position: change.position }).then(() =>
              setSaveState('salvo'),
            )
          }
        }
        if (change.type === 'remove') {
          removeNode(change.id)
          void excluirNode(change.id, funnelId)
        }
      }
    },
    [funnelId, moveNode, removeNode, setSaveState],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          removeEdge(change.id)
          void excluirEdge(change.id)
        }
      }
    },
    [removeEdge],
  )

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return

      setSaveState('salvando')
      const r = await criarEdge({
        funnelId,
        sourceId: connection.source,
        targetId: connection.target,
      })

      if (!r.ok) {
        setSaveState('erro')
        avisar(r.erro)
        return
      }

      addEdge({ id: r.id, source: connection.source, target: connection.target, label: '' })
      setSaveState('salvo')
    },
    [addEdge, avisar, funnelId, setSaveState],
  )

  const adicionarEtapa = useCallback(
    async (tipo: NodeType, position: { x: number; y: number }) => {
      const label = getNodeType(tipo).label
      setSaveState('salvando')

      const r = await criarNode({ funnelId, type: tipo, label, position })
      if (!r.ok) {
        setSaveState('erro')
        avisar(r.erro)
        return
      }

      const novo: CanvasNode = { id: r.id, type: tipo, position, label, rev: 0 }
      addNode(novo)
      setSaveState('salvo')

      // A tarefa automática é invisível se ninguém avisar que ela nasceu.
      if (r.tarefaCriada) avisar(`Tarefa criada: ${r.tarefaCriada}`)
    },
    [addNode, avisar, funnelId, setSaveState],
  )

  // Clique duplo na biblioteca adiciona no centro da tela.
  useEffect(() => {
    function handler(event: Event) {
      const tipo = (event as CustomEvent<string>).detail
      if (!isNodeType(tipo)) return
      const box = wrapper.current?.getBoundingClientRect()
      if (!box) return
      void adicionarEtapa(
        tipo,
        screenToFlowPosition({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
      )
    }
    window.addEventListener('gd:add-etapa', handler)
    return () => window.removeEventListener('gd:add-etapa', handler)
  }, [adicionarEtapa, screenToFlowPosition])

  return (
    <div ref={wrapper} className="relative h-full flex-1">
      {pronto ? (
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => selecionar(node.id)}
          onPaneClick={() => selecionar(null)}
          onMoveEnd={(_, viewport) => void salvarViewport(funnelId, viewport)}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(e) => {
            e.preventDefault()
            const tipo = e.dataTransfer.getData('application/gd-etapa')
            if (!isNodeType(tipo)) return
            void adicionarEtapa(
              tipo,
              screenToFlowPosition({ x: e.clientX, y: e.clientY }),
            )
          }}
          fitView
          minZoom={0.2}
          maxZoom={2}
          deleteKeyCode={['Delete', 'Backspace']}
          proOptions={{ hideAttribution: true }}
          onlyRenderVisibleElements={nodes.length > 150}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--border)" />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            maskColor="transparent"
            nodeColor="var(--border)"
            style={{ width: 130, height: 90 }}
          />
        </ReactFlow>
      ) : null}
    </div>
  )
}

export type { CanvasNode, CanvasEdge }
