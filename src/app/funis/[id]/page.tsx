import { notFound, redirect } from 'next/navigation'
import { createClient, requireUser } from '@/lib/supabase/server'
import { isNodeType } from '@/domain/funnel/taxonomy'
import { EditorFunil } from '@/features/canvas/editor-funil'
import type { CanvasEdge, CanvasNode } from '@/features/canvas/store'
import type { FunnelEdgeRow, FunnelNodeRow, FunnelRow } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default async function FunilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  if (!user) redirect('/entrar')

  const supabase = await createClient()

  const [{ data: funil }, { data: nodeRows }, { data: edgeRows }] = await Promise.all([
    supabase.from('funnels').select('*').eq('id', id).maybeSingle<FunnelRow>(),
    supabase.from('funnel_nodes').select('*').eq('funnel_id', id).returns<FunnelNodeRow[]>(),
    supabase.from('funnel_edges').select('*').eq('funnel_id', id).returns<FunnelEdgeRow[]>(),
  ])

  if (!funil) notFound()

  // Um tipo desconhecido no banco (migration antiga, import torto) não pode
  // derrubar a tela inteira — a etapa é ignorada e o resto do funil abre.
  const nodes: CanvasNode[] = (nodeRows ?? []).flatMap((row) => {
    if (!isNodeType(row.type)) return []
    const data = row.data as Record<string, unknown>
    return [
      {
        id: row.id,
        type: row.type,
        position: row.position,
        label: String(data.label ?? 'Etapa'),
        objetivo: data.objetivo ? String(data.objetivo) : undefined,
        url: data.url ? String(data.url) : undefined,
        observacoes: data.observacoes ? String(data.observacoes) : undefined,
        ultimoLancamento: (data.ultimoLancamento as Record<string, number> | undefined) ?? undefined,
        ultimoLancamentoEm: data.ultimoLancamentoEm ? String(data.ultimoLancamentoEm) : undefined,
        rev: Number(data.rev ?? 0),
      },
    ]
  })

  const edges: CanvasEdge[] = (edgeRows ?? []).map((row) => ({
    id: row.id,
    source: row.source_id,
    target: row.target_id,
    label: String((row.data as Record<string, unknown>).label ?? ''),
  }))

  return <EditorFunil funil={{ id: funil.id, nome: funil.nome }} nodes={nodes} edges={edges} />
}
