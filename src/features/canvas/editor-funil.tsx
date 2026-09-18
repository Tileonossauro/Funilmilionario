'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCanvasStore, type CanvasEdge, type CanvasNode } from '@/features/canvas/store'
import { Canvas } from '@/features/canvas/canvas'
import { Biblioteca } from '@/features/canvas/biblioteca'
import { PainelPropriedades } from '@/features/canvas/painel-propriedades'
import { ThemeToggle } from '@/features/shell/theme-toggle'
import { renomearFunil } from '@/app/funis/actions'
import { Spinner } from '@/components/ui/primitives'

interface Props {
  funil: { id: string; nome: string }
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export function EditorFunil({ funil, nodes, edges }: Props) {
  const iniciar = useCanvasStore((s) => s.iniciar)
  const saveState = useCanvasStore((s) => s.saveState)
  const aviso = useCanvasStore((s) => s.aviso)
  const avisar = useCanvasStore((s) => s.avisar)
  const [nome, setNome] = useState(funil.nome)

  useEffect(() => {
    iniciar(funil.id, nodes, edges)
  }, [funil.id, nodes, edges, iniciar])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => avisar(null), 4000)
    return () => clearTimeout(t)
  }, [aviso, avisar])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-[var(--surface)] px-4">
        <Link
          href="/funis"
          className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          ← Funis
        </Link>

        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome !== funil.nome && void renomearFunil(funil.id, nome)}
          className="min-w-0 max-w-xs flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm font-medium outline-none hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)]"
        />

        <IndicadorSalvamento estado={saveState} />

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/tarefas"
            className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            Tarefas
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Biblioteca />
        <Canvas funnelId={funil.id} />
        <PainelPropriedades funnelId={funil.id} />
      </div>

      {aviso ? (
        <div className="animate-in fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-[var(--surface)] px-3.5 py-2 text-xs shadow-lg">
          {aviso}
        </div>
      ) : null}
    </div>
  )
}

function IndicadorSalvamento({ estado }: { estado: string }) {
  if (estado === 'ocioso') return null

  const conteudo =
    estado === 'salvando' ? (
      <>
        <Spinner /> Salvando...
      </>
    ) : estado === 'erro' ? (
      <span className="text-[var(--danger)]">Erro ao salvar</span>
    ) : (
      <span className="text-[var(--ok)]">✓ Salvo</span>
    )

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
      {conteudo}
    </span>
  )
}
