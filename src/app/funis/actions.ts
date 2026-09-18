'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, requireUser } from '@/lib/supabase/server'
import type { FunnelNodeRow } from '@/lib/supabase/types'
import { isNodeType } from '@/domain/funnel/taxonomy'
import { taskForNewNode } from '@/domain/tasks/rules'

export type ActionResult = { ok: true } | { ok: false; erro: string }

async function ctx() {
  const user = await requireUser()
  if (!user) redirect('/entrar')
  return { user, supabase: await createClient() }
}

// ── Funis ────────────────────────────────────────────────────────────────────

export async function criarFunil(formData: FormData): Promise<void> {
  const { user, supabase } = await ctx()
  const nome = String(formData.get('nome') ?? '').trim() || 'Novo funil'

  const { data, error } = await supabase
    .from('funnels')
    .insert({ owner_id: user.id, nome })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Falha ao criar funil.')

  revalidatePath('/funis')
  redirect(`/funis/${data.id}`)
}

export async function renomearFunil(id: string, nome: string): Promise<ActionResult> {
  const { supabase } = await ctx()
  const limpo = nome.trim()
  if (!limpo) return { ok: false, erro: 'O nome não pode ficar vazio.' }

  const { error } = await supabase.from('funnels').update({ nome: limpo }).eq('id', id)
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/funis')
  return { ok: true }
}

export async function excluirFunil(id: string): Promise<void> {
  const { supabase } = await ctx()
  await supabase.from('funnels').delete().eq('id', id)
  revalidatePath('/funis')
}

// ── Grafo ────────────────────────────────────────────────────────────────────

const criarNodeSchema = z.object({
  funnelId: z.string().uuid(),
  type: z.string().refine(isNodeType, 'Tipo de etapa desconhecido.'),
  label: z.string().min(1).max(120),
  position: z.object({ x: z.number(), y: z.number() }),
})

/**
 * Criar etapa também cria a tarefa de acompanhamento, quando o tipo tem regra.
 * As duas coisas juntas numa action só: se a tarefa nascesse no cliente, bastaria
 * um refresh no momento errado para a etapa existir sem o acompanhamento dela.
 */
export async function criarNode(input: z.input<typeof criarNodeSchema>) {
  const { user, supabase } = await ctx()
  const parsed = criarNodeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }
  const { funnelId, type, label, position } = parsed.data

  const { data, error } = await supabase
    .from('funnel_nodes')
    .insert({
      funnel_id: funnelId,
      owner_id: user.id,
      type,
      position,
      data: { label, rev: 0 },
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false as const, erro: error?.message ?? 'Falha ao criar etapa.' }

  const tarefa = isNodeType(type) ? taskForNewNode(data.id, type, label) : null
  if (tarefa) {
    await supabase.from('tasks').insert({
      funnel_id: funnelId,
      node_id: data.id,
      owner_id: user.id,
      titulo: tarefa.titulo,
      vencimento: tarefa.vencimento,
      origem: 'regra',
    })
  }

  await bumpNodeCount(funnelId)
  return { ok: true as const, id: data.id, tarefaCriada: tarefa?.titulo ?? null }
}

export async function atualizarNode(
  id: string,
  patch: { position?: { x: number; y: number }; data?: Record<string, unknown> },
): Promise<ActionResult> {
  const { supabase } = await ctx()
  const update: Partial<FunnelNodeRow> = {}
  if (patch.position) update.position = patch.position
  if (patch.data) update.data = patch.data

  const { error } = await supabase.from('funnel_nodes').update(update).eq('id', id)
  return error ? { ok: false, erro: error.message } : { ok: true }
}

export async function excluirNode(id: string, funnelId: string): Promise<ActionResult> {
  const { supabase } = await ctx()
  const { error } = await supabase.from('funnel_nodes').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  await bumpNodeCount(funnelId)
  return { ok: true }
}

export async function criarEdge(input: {
  funnelId: string
  sourceId: string
  targetId: string
  label?: string
}) {
  const { user, supabase } = await ctx()
  if (input.sourceId === input.targetId) {
    return { ok: false as const, erro: 'Uma etapa não conecta nela mesma.' }
  }

  const { data, error } = await supabase
    .from('funnel_edges')
    .insert({
      funnel_id: input.funnelId,
      owner_id: user.id,
      source_id: input.sourceId,
      target_id: input.targetId,
      data: { label: input.label ?? '', rev: 0 },
    })
    .select('id')
    .single()

  // 23505 = índice único: a conexão já existe. Não é erro que valha assustar o usuário.
  if (error?.code === '23505') return { ok: false as const, erro: 'Essas etapas já estão ligadas.' }
  if (error || !data) return { ok: false as const, erro: error?.message ?? 'Falha ao conectar.' }

  return { ok: true as const, id: data.id }
}

export async function atualizarEdge(id: string, label: string): Promise<ActionResult> {
  const { supabase } = await ctx()
  const { error } = await supabase
    .from('funnel_edges')
    .update({ data: { label, rev: Date.now() } })
    .eq('id', id)
  return error ? { ok: false, erro: error.message } : { ok: true }
}

export async function excluirEdge(id: string): Promise<ActionResult> {
  const { supabase } = await ctx()
  const { error } = await supabase.from('funnel_edges').delete().eq('id', id)
  return error ? { ok: false, erro: error.message } : { ok: true }
}

export async function salvarViewport(
  funnelId: string,
  viewport: { x: number; y: number; zoom: number },
): Promise<void> {
  const { supabase } = await ctx()
  await supabase.from('funnels').update({ viewport }).eq('id', funnelId)
}

async function bumpNodeCount(funnelId: string) {
  const { supabase } = await ctx()
  const { count } = await supabase
    .from('funnel_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('funnel_id', funnelId)

  await supabase.from('funnels').update({ node_count: count ?? 0 }).eq('id', funnelId)
}

// ── Lançamentos ──────────────────────────────────────────────────────────────

const lancamentoSchema = z.object({
  nodeId: z.string().uuid(),
  funnelId: z.string().uuid(),
  periodoDe: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodoAte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valores: z.record(z.string(), z.number().nonnegative()),
  origem: z.enum(['manual', 'screenshot']),
  observacao: z.string().max(500).optional(),
})

export async function registrarLancamento(input: z.input<typeof lancamentoSchema>) {
  const { user, supabase } = await ctx()
  const parsed = lancamentoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }
  const v = parsed.data

  if (v.periodoAte < v.periodoDe) {
    return { ok: false as const, erro: 'A data final não pode ser antes da inicial.' }
  }
  if (Object.keys(v.valores).length === 0) {
    return { ok: false as const, erro: 'Informe ao menos um número.' }
  }

  const { error } = await supabase.from('metric_entries').insert({
    node_id: v.nodeId,
    funnel_id: v.funnelId,
    owner_id: user.id,
    periodo_de: v.periodoDe,
    periodo_ate: v.periodoAte,
    valores: v.valores,
    origem: v.origem,
    observacao: v.observacao ?? null,
  })
  if (error) return { ok: false as const, erro: error.message }

  // Espelha o último lançamento no node para o canvas renderizar sem N queries.
  const { data: node } = await supabase
    .from('funnel_nodes')
    .select('data')
    .eq('id', v.nodeId)
    .single()

  const atual = (node?.data ?? {}) as Record<string, unknown>
  await supabase
    .from('funnel_nodes')
    .update({
      data: {
        ...atual,
        ultimoLancamento: v.valores,
        ultimoLancamentoEm: v.periodoAte,
        rev: Number(atual.rev ?? 0) + 1,
      },
    })
    .eq('id', v.nodeId)

  revalidatePath(`/funis/${v.funnelId}`)
  return { ok: true as const }
}

// ── Tarefas ──────────────────────────────────────────────────────────────────

export async function criarTarefa(input: {
  funnelId: string
  nodeId: string | null
  titulo: string
  vencimento: string
}): Promise<ActionResult> {
  const { user, supabase } = await ctx()
  const titulo = input.titulo.trim()
  if (!titulo) return { ok: false, erro: 'A tarefa precisa de um título.' }

  const { error } = await supabase.from('tasks').insert({
    funnel_id: input.funnelId,
    node_id: input.nodeId,
    owner_id: user.id,
    titulo,
    vencimento: input.vencimento,
    origem: 'manual',
  })
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/tarefas')
  revalidatePath(`/funis/${input.funnelId}`)
  return { ok: true }
}

export async function alternarTarefa(id: string, feita: boolean): Promise<ActionResult> {
  const { supabase } = await ctx()
  const { error } = await supabase
    .from('tasks')
    .update({
      status: feita ? 'feita' : 'aberta',
      concluida_em: feita ? new Date().toISOString() : null,
    })
    .eq('id', id)
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/tarefas')
  return { ok: true }
}

export async function excluirTarefa(id: string): Promise<ActionResult> {
  const { supabase } = await ctx()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/tarefas')
  return { ok: true }
}

export async function sair(): Promise<void> {
  const { supabase } = await ctx()
  await supabase.auth.signOut()
  redirect('/entrar')
}

/** Só existe para o painel de propriedades listar o histórico da etapa. */
export async function historicoDaEtapa(nodeId: string) {
  const { supabase } = await ctx()
  const { data } = await supabase
    .from('metric_entries')
    .select('id, periodo_de, periodo_ate, valores, origem, created_at')
    .eq('node_id', nodeId)
    .order('periodo_ate', { ascending: false })
    .limit(20)

  return data ?? []
}
