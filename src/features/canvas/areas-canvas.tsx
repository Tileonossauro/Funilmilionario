'use client'

import { useRef } from 'react'
import { ViewportPortal, useReactFlow } from '@xyflow/react'
import { useCanvasStore } from '@/features/canvas/store'
import { faixas, contarPorArea, type CorArea } from '@/domain/funnel/areas'
import { cn } from '@/lib/cn'

/** Faixas bem mais largas que qualquer funil real, para não aparecer borda lateral. */
const LARGURA = 6000
const X_INICIAL = -2000

const CORES: Record<CorArea, { fundo: string; texto: string; borda: string }> = {
  violeta: { fundo: 'bg-violet-500/[0.06]', texto: 'text-violet-600 dark:text-violet-400', borda: 'border-violet-500/25' },
  ambar: { fundo: 'bg-amber-500/[0.06]', texto: 'text-amber-600 dark:text-amber-400', borda: 'border-amber-500/25' },
  ceu: { fundo: 'bg-sky-500/[0.06]', texto: 'text-sky-600 dark:text-sky-400', borda: 'border-sky-500/25' },
  esmeralda: { fundo: 'bg-emerald-500/[0.06]', texto: 'text-emerald-600 dark:text-emerald-400', borda: 'border-emerald-500/25' },
  rosa: { fundo: 'bg-rose-500/[0.06]', texto: 'text-rose-600 dark:text-rose-400', borda: 'border-rose-500/25' },
  cinza: { fundo: 'bg-slate-500/[0.06]', texto: 'text-slate-500 dark:text-slate-400', borda: 'border-slate-500/25' },
}

export function AreasCanvas({ aoMudar }: { aoMudar: () => void }) {
  const areas = useCanvasStore((s) => s.areas)
  const nodes = useCanvasStore((s) => s.nodes)

  if (areas.length === 0) return null

  const lista = faixas(areas)
  const contagem = contarPorArea(areas, nodes)

  return (
    <ViewportPortal>
      {lista.map(({ area, inicio, fim }, indice) => (
        <FaixaArea
          key={area.id}
          areaId={area.id}
          label={area.label}
          cor={area.cor}
          inicio={inicio}
          altura={fim - inicio}
          quantidade={contagem[indice]?.quantidade ?? 0}
          ultima={indice === lista.length - 1}
          aoMudar={aoMudar}
        />
      ))}
    </ViewportPortal>
  )
}

function FaixaArea({
  areaId,
  label,
  cor,
  inicio,
  altura,
  quantidade,
  ultima,
  aoMudar,
}: {
  areaId: string
  label: string
  cor: CorArea
  inicio: number
  altura: number
  quantidade: number
  ultima: boolean
  aoMudar: () => void
}) {
  const { getZoom } = useReactFlow()
  const renomearArea = useCanvasStore((s) => s.renomearArea)
  const removerArea = useCanvasStore((s) => s.removerArea)
  const redimensionarArea = useCanvasStore((s) => s.redimensionarArea)
  const arrastando = useRef<{ yInicial: number; alturaInicial: number } | null>(null)

  const estilo = CORES[cor]

  /**
   * O arraste da borda acontece em pixels de tela, mas a altura é medida em
   * coordenadas do canvas — sem dividir pelo zoom, redimensionar com o mapa
   * afastado mexeria muito mais do que o dedo andou.
   */
  function aoPressionar(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    arrastando.current = { yInicial: e.clientY, alturaInicial: altura }
  }

  function aoMover(e: React.PointerEvent) {
    if (!arrastando.current) return
    const delta = (e.clientY - arrastando.current.yInicial) / (getZoom() || 1)
    redimensionarArea(areaId, arrastando.current.alturaInicial + delta)
  }

  function aoSoltar(e: React.PointerEvent) {
    if (!arrastando.current) return
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    arrastando.current = null
    aoMudar()
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: X_INICIAL,
        top: inicio,
        width: LARGURA,
        height: altura,
      }}
      className={cn('pointer-events-none border-t border-dashed', estilo.fundo, estilo.borda)}
    >
      {/* O cabeçalho é o único pedaço clicável: o resto deixa o clique passar
          para o canvas, senão a faixa engoliria pan, seleção e conexão. */}
      <div
        className="pointer-events-auto absolute flex items-center gap-2"
        style={{ left: 2020, top: 8 }}
      >
        <input
          value={label}
          onChange={(e) => renomearArea(areaId, e.target.value)}
          onBlur={aoMudar}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={cn(
            'w-28 rounded-md bg-transparent px-1.5 py-0.5 text-[13px] font-semibold uppercase tracking-wide',
            'outline-none transition-colors hover:bg-[var(--surface)] focus:bg-[var(--surface)]',
            estilo.texto,
          )}
        />
        <span className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
          {quantidade} {quantidade === 1 ? 'etapa' : 'etapas'}
        </span>
        <button
          type="button"
          onClick={() => {
            removerArea(areaId)
            aoMudar()
          }}
          title="Remover área"
          className="rounded-md px-1 text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
        >
          ✕
        </button>
      </div>

      {!ultima ? (
        <div
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          title="Arraste para ajustar a altura"
          className="pointer-events-auto absolute inset-x-0 bottom-0 h-3 cursor-ns-resize"
        />
      ) : null}
    </div>
  )
}
