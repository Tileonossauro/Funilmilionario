import { getNodeType, type NodeType } from '@/domain/funnel/taxonomy'

export type TaskStatus = 'aberta' | 'feita'

export interface Task {
  id: string
  funnelId: string
  nodeId: string | null
  titulo: string
  vencimento: string // ISO date (YYYY-MM-DD)
  status: TaskStatus
  origem: 'regra' | 'manual'
  criadaEm: string
}

export interface PendingTask {
  nodeId: string
  titulo: string
  vencimento: string
  origem: 'regra'
}

export function addDays(base: Date, days: number): string {
  const d = new Date(base.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Tarefa de acompanhamento disparada ao criar uma etapa.
 * Devolve null quando o tipo não tem regra — nem toda etapa merece uma tarefa,
 * e encher a lista de ruído faz a pessoa parar de olhar a lista.
 */
export function taskForNewNode(
  nodeId: string,
  type: NodeType,
  label: string,
  now: Date = new Date(),
): PendingTask | null {
  const rule = getNodeType(type).taskRule
  if (!rule) return null

  return {
    nodeId,
    titulo: `${rule.titulo} — ${label}`,
    vencimento: addDays(now, rule.prazoDias),
    origem: 'regra',
  }
}

export function isAtrasada(task: Pick<Task, 'vencimento' | 'status'>, today = new Date()): boolean {
  if (task.status === 'feita') return false
  return task.vencimento < today.toISOString().slice(0, 10)
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'aberta' ? -1 : 1
    return a.vencimento.localeCompare(b.vencimento)
  })
}
