'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { getNodeType, FAMILY_META, type NodeType } from '@/domain/funnel/taxonomy'
import { METRIC_META, computeDerived, DERIVED_META, formatMetric } from '@/domain/metrics/keys'
import type { MetricKey } from '@/domain/metrics/keys'
import { cn } from '@/lib/cn'

export interface EtapaNodeData extends Record<string, unknown> {
  label: string
  etapaTipo: NodeType
  ultimoLancamento?: Record<string, number>
  ultimoLancamentoEm?: string
  rev: number
}

const HUE_CLASSES: Record<string, string> = {
  violet: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  sky: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
  slate: 'text-slate-600 dark:text-slate-400 bg-slate-500/10',
}

function EtapaNodeImpl({ data, selected }: NodeProps) {
  const d = data as EtapaNodeData
  const def = getNodeType(d.etapaTipo)
  const hue = HUE_CLASSES[FAMILY_META[def.family].hue] ?? HUE_CLASSES.slate!

  const valores = (d.ultimoLancamento ?? {}) as Partial<Record<MetricKey, number>>
  const chaves = Object.keys(valores) as MetricKey[]
  const derivadas = computeDerived(valores)
  const derivadaPrincipal = (Object.keys(derivadas) as (keyof typeof derivadas)[])[0]

  return (
    <div
      className={cn(
        'w-[190px] rounded-xl border bg-[var(--surface)] shadow-sm transition-all duration-100',
        selected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/25'
          : 'hover:border-[var(--text-muted)]',
      )}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-start gap-2 p-3">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md text-xs',
            hue,
          )}
        >
          {def.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">{d.label}</p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">{def.label}</p>
        </div>
      </div>

      {chaves.length > 0 ? (
        <div className="border-t px-3 py-2">
          <div className="space-y-1">
            {chaves.slice(0, 3).map((k) => {
              const meta = METRIC_META[k]
              const valor = valores[k]
              if (!meta || valor === undefined) return null
              return (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-[var(--text-muted)]">{meta.label}</span>
                  <span className="text-[11px] font-medium tabular-nums">
                    {formatMetric(valor, meta.format)}
                  </span>
                </div>
              )
            })}
          </div>

          {derivadaPrincipal && derivadas[derivadaPrincipal] !== undefined ? (
            <div className="mt-1.5 flex items-baseline justify-between gap-2 border-t pt-1.5">
              <span className="text-[10px] font-medium text-[var(--accent)]">
                {DERIVED_META[derivadaPrincipal].label}
              </span>
              <span className="text-[11px] font-semibold tabular-nums text-[var(--accent)]">
                {formatMetric(derivadas[derivadaPrincipal]!, DERIVED_META[derivadaPrincipal].format)}
              </span>
            </div>
          ) : null}
        </div>
      ) : def.metrics.length > 0 ? (
        <div className="border-t px-3 py-1.5">
          <span className="text-[10px] text-[var(--text-muted)]">Sem números ainda</span>
        </div>
      ) : null}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

/**
 * `rev` muda a cada mutação da etapa, então comparar três campos resolve.
 * Sem isto, arrastar uma etapa re-renderiza todas as outras.
 */
export const EtapaNode = memo(EtapaNodeImpl, (prev, next) => {
  const a = prev.data as EtapaNodeData
  const b = next.data as EtapaNodeData
  return a.rev === b.rev && prev.selected === next.selected && a.label === b.label
})
