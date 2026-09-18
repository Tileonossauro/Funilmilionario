'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { getNodeType, type NodeType } from '@/domain/funnel/taxonomy'
import { volumesDaEtapa } from '@/domain/funnel/fluxo'
import { METRIC_META, formatMetric, type MetricKey } from '@/domain/metrics/keys'
import { IconeEtapa } from '@/components/ui/icone-etapa'
import { cn } from '@/lib/cn'

export interface EtapaNodeData extends Record<string, unknown> {
  label: string
  etapaTipo: NodeType
  ultimoLancamento?: Record<string, number>
  ultimoLancamentoEm?: string
  rev: number
}

/**
 * Cada família tem cor E silhueta próprias. A forma é o que deixa o funil
 * legível de longe, com o zoom afastado, sem ninguém ler uma palavra:
 * tráfego é pílula, página tem cara de janela, lógica é losango.
 */
const ESTILO_FAMILIA: Record<string, { cor: string; tile: string; forma: string }> = {
  trafego: {
    cor: 'text-violet-600 dark:text-violet-400',
    tile: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
    forma: 'rounded-full px-1.5',
  },
  conteudo: {
    cor: 'text-amber-600 dark:text-amber-400',
    tile: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    forma: 'rounded-2xl',
  },
  pagina: {
    cor: 'text-sky-600 dark:text-sky-400',
    tile: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
    forma: 'rounded-lg',
  },
  contato: {
    cor: 'text-emerald-600 dark:text-emerald-400',
    tile: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    forma: 'rounded-2xl rounded-bl-md',
  },
  produto: {
    cor: 'text-rose-600 dark:text-rose-400',
    tile: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
    forma: 'rounded-xl',
  },
  outros: {
    cor: 'text-slate-500 dark:text-slate-400',
    tile: 'bg-slate-500/12 text-slate-500 dark:text-slate-400',
    forma: 'rounded-lg border-dashed',
  },
}

function EtapaNodeImpl({ data, selected }: NodeProps) {
  const d = data as EtapaNodeData
  const def = getNodeType(d.etapaTipo)
  const estilo = ESTILO_FAMILIA[def.family] ?? ESTILO_FAMILIA.outros!

  const valores = (d.ultimoLancamento ?? {}) as Partial<Record<MetricKey, number>>
  const { entrada, saida, conversao } = volumesDaEtapa(d.etapaTipo, valores)
  const temNumeros = Object.keys(valores).length > 0

  return (
    <div
      className={cn(
        'w-[188px] border bg-[var(--surface)] transition-all duration-100',
        estilo.forma,
        selected
          ? 'border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-soft)]'
          : 'shadow-sm hover:border-[var(--text-muted)]',
      )}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg',
            estilo.tile,
          )}
        >
          <IconeEtapa nome={def.icon} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-snug">{d.label}</p>
          <p className={cn('truncate text-[10px] leading-tight', estilo.cor)}>{def.label}</p>
        </div>
      </div>

      {temNumeros ? (
        <div className="border-t px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <Volume valor={entrada} chave={def.volumeIn} />
            {conversao !== undefined ? (
              <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {formatMetric(conversao, 'percentual')}
              </span>
            ) : null}
            <Volume valor={saida} chave={def.volumeOut} alinharDireita />
          </div>
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

function Volume({
  valor,
  chave,
  alinharDireita,
}: {
  valor: number | undefined
  chave: MetricKey | undefined
  alinharDireita?: boolean
}) {
  if (valor === undefined || !chave) {
    return <span className="text-[10px] text-[var(--text-muted)]">—</span>
  }
  const meta = METRIC_META[chave]

  return (
    <span className={cn('min-w-0 flex-1', alinharDireita && 'text-right')}>
      <span className="block truncate text-[11px] font-medium tabular-nums leading-tight">
        {formatMetric(valor, meta.format)}
      </span>
      <span className="block truncate text-[9px] leading-tight text-[var(--text-muted)]">
        {meta.label}
      </span>
    </span>
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
