import Link from 'next/link'
import { createClient, requireUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui/primitives'
import { AppHeader } from '@/features/shell/app-header'
import { NovoFunilForm } from '@/features/dashboard/novo-funil-form'
import type { FunnelRow } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  pausado: 'Pausado',
  arquivado: 'Arquivado',
}

export default async function FunisPage() {
  const user = await requireUser()
  if (!user) redirect('/entrar')

  const supabase = await createClient()
  const [{ data: funis }, { count: tarefasAbertas }] = await Promise.all([
    supabase
      .from('funnels')
      .select('*')
      .order('updated_at', { ascending: false })
      .returns<FunnelRow[]>(),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aberta')
      .lte('vencimento', new Date().toISOString().slice(0, 10)),
  ])

  const lista = funis ?? []

  return (
    <div className="min-h-screen">
      <AppHeader tarefasVencidas={tarefasAbertas ?? 0} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Meus funis</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {lista.length === 0
                ? 'Nenhum funil ainda'
                : `${lista.length} ${lista.length === 1 ? 'funil' : 'funis'}`}
            </p>
          </div>
          <NovoFunilForm />
        </div>

        {lista.length === 0 ? (
          <EmptyState
            titulo="Comece pelo primeiro funil"
            descricao="Monte a jornada arrastando as etapas: Instagram, Reels, Landing Page, WhatsApp, App. Depois você lança os números de cada uma."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((funil) => (
              <li key={funil.id}>
                <Link
                  href={`/funis/${funil.id}`}
                  className="group block rounded-xl border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate text-sm font-medium">{funil.nome}</h2>
                    <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                      {STATUS_LABEL[funil.status] ?? funil.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    {funil.node_count} {funil.node_count === 1 ? 'etapa' : 'etapas'}
                    {' · '}
                    editado {formatarData(funil.updated_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function formatarData(iso: string): string {
  const data = new Date(iso)
  const diffMin = Math.round((Date.now() - data.getTime()) / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  if (diffMin < 1440) return `há ${Math.floor(diffMin / 60)}h`
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
