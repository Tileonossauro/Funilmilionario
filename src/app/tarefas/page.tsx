import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, requireUser } from '@/lib/supabase/server'
import { AppHeader } from '@/features/shell/app-header'
import { EmptyState } from '@/components/ui/primitives'
import { ListaTarefas } from '@/features/tarefas/lista-tarefas'
import type { TaskRow } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default async function TarefasPage() {
  const user = await requireUser()
  if (!user) redirect('/entrar')

  const supabase = await createClient()
  const [{ data: tarefas }, { data: funis }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .order('vencimento', { ascending: true })
      .limit(200)
      .returns<TaskRow[]>(),
    supabase.from('funnels').select('id, nome').returns<{ id: string; nome: string }[]>(),
  ])

  const lista = tarefas ?? []
  const nomePorFunil = Object.fromEntries((funis ?? []).map((f) => [f.id, f.nome]))
  const vencidas = lista.filter(
    (t) => t.status === 'aberta' && t.vencimento < new Date().toISOString().slice(0, 10),
  ).length

  return (
    <div className="min-h-screen">
      <AppHeader tarefasVencidas={vencidas} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-lg font-semibold tracking-tight">Tarefas</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {lista.filter((t) => t.status === 'aberta').length} abertas
            {vencidas > 0 ? ` · ${vencidas} atrasadas` : ''}
          </p>
        </div>

        {lista.length === 0 ? (
          <EmptyState
            titulo="Nenhuma tarefa ainda"
            descricao="Ao adicionar uma Landing Page, campanha ou WhatsApp no funil, a tarefa de conferir os dados aparece aqui automaticamente."
            acao={
              <Link href="/funis" className="text-xs text-[var(--accent)] hover:underline">
                Ir para os funis
              </Link>
            }
          />
        ) : (
          <ListaTarefas tarefas={lista} nomePorFunil={nomePorFunil} />
        )}
      </main>
    </div>
  )
}
