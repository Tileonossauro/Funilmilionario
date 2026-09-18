'use client'

import Link from 'next/link'
import { useState, useOptimistic, startTransition } from 'react'
import { alternarTarefa, excluirTarefa } from '@/app/funis/actions'
import { isAtrasada, sortTasks, type Task } from '@/domain/tasks/rules'
import { cn } from '@/lib/cn'
import type { TaskRow } from '@/lib/supabase/types'

interface Props {
  tarefas: TaskRow[]
  nomePorFunil: Record<string, string>
}

export function ListaTarefas({ tarefas, nomePorFunil }: Props) {
  const [ocultas, setOcultas] = useState<Set<string>>(new Set())
  const [otimistas, alternarOtimista] = useOptimistic(
    tarefas,
    (estado: TaskRow[], { id, feita }: { id: string; feita: boolean }) =>
      estado.map((t) => (t.id === id ? { ...t, status: feita ? 'feita' : 'aberta' } : t)),
  )

  const visiveis = otimistas.filter((t) => !ocultas.has(t.id))
  const ordenadas = sortTasks(
    visiveis.map((t) => ({
      id: t.id,
      funnelId: t.funnel_id,
      nodeId: t.node_id,
      titulo: t.titulo,
      vencimento: t.vencimento,
      status: t.status,
      origem: t.origem,
      criadaEm: t.created_at,
    })) satisfies Task[],
  )

  return (
    <ul className="space-y-1.5">
      {ordenadas.map((tarefa) => {
        const atrasada = isAtrasada(tarefa)
        const feita = tarefa.status === 'feita'

        return (
          <li
            key={tarefa.id}
            className={cn(
              'group flex items-center gap-3 rounded-xl border bg-[var(--surface)] px-3.5 py-2.5',
              'transition-colors',
              atrasada && 'border-[var(--danger)]/40',
            )}
          >
            <input
              type="checkbox"
              checked={feita}
              aria-label={feita ? 'Reabrir tarefa' : 'Concluir tarefa'}
              onChange={(e) => {
                const novoValor = e.target.checked
                startTransition(async () => {
                  alternarOtimista({ id: tarefa.id, feita: novoValor })
                  await alternarTarefa(tarefa.id, novoValor)
                })
              }}
              className="size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
            />

            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-sm', feita && 'text-[var(--text-muted)] line-through')}>
                {tarefa.titulo}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span className={atrasada ? 'font-medium text-[var(--danger)]' : undefined}>
                  {formatarVencimento(tarefa.vencimento, atrasada)}
                </span>
                <span>·</span>
                <Link
                  href={`/funis/${tarefa.funnelId}`}
                  className="truncate transition-colors hover:text-[var(--text)]"
                >
                  {nomePorFunil[tarefa.funnelId] ?? 'funil'}
                </Link>
                {tarefa.origem === 'regra' ? (
                  <>
                    <span>·</span>
                    <span title="Criada automaticamente ao adicionar a etapa">auto</span>
                  </>
                ) : null}
              </p>
            </div>

            <button
              onClick={() => {
                setOcultas((s) => new Set(s).add(tarefa.id))
                void excluirTarefa(tarefa.id)
              }}
              aria-label="Excluir tarefa"
              className="shrink-0 rounded-md px-1.5 py-1 text-xs text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--danger)] group-hover:opacity-100 focus:opacity-100"
            >
              ✕
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function formatarVencimento(vencimento: string, atrasada: boolean): string {
  const hoje = new Date().toISOString().slice(0, 10)
  if (vencimento === hoje) return 'vence hoje'
  if (atrasada) {
    const dias = Math.round(
      (Date.parse(hoje) - Date.parse(vencimento)) / 86_400_000,
    )
    return `atrasada ${dias}d`
  }
  const data = new Date(`${vencimento}T12:00:00Z`)
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
