'use client'

import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { formatMetric } from '@/domain/metrics/keys'
import { cn } from '@/lib/cn'

export interface EtapaEdgeData extends Record<string, unknown> {
  label?: string
  /** Taxa de passagem entre as duas etapas, já calculada no canvas. */
  taxa?: number
}

/**
 * Faixas de cor da taxa de passagem. Os cortes são propositalmente frouxos:
 * o objetivo é chamar atenção para queda grande, não dar nota a cada aresta.
 * Um funil inteiro vermelho não informa nada.
 */
function corDaTaxa(taxa: number): string {
  if (taxa >= 0.6) return 'text-[var(--ok)] border-[var(--ok)]/30'
  if (taxa >= 0.3) return 'text-[var(--warn)] border-[var(--warn)]/30'
  return 'text-[var(--danger)] border-[var(--danger)]/30'
}

function EtapaEdgeImpl({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  })

  const d = (data ?? {}) as EtapaEdgeData
  const temRotulo = Boolean(d.label)
  const temTaxa = typeof d.taxa === 'number'

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} />

      {temRotulo || temTaxa ? (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className="pointer-events-none absolute flex items-center gap-1"
          >
            {temTaxa ? (
              <span
                title="Quantos passaram desta etapa para a próxima"
                className={cn(
                  'rounded-md border bg-[var(--surface)] px-1.5 py-0.5',
                  'text-[10px] font-semibold tabular-nums shadow-sm',
                  corDaTaxa(d.taxa!),
                )}
              >
                {formatMetric(d.taxa!, 'percentual')}
              </span>
            ) : null}

            {temRotulo ? (
              <span
                className={cn(
                  'rounded-md border bg-[var(--surface)] px-1.5 py-0.5 text-[10px] shadow-sm',
                  selected && 'border-[var(--accent)]',
                )}
              >
                {d.label}
              </span>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

export const EtapaEdge = memo(EtapaEdgeImpl)
