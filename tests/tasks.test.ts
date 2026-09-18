import { describe, it, expect } from 'vitest'
import { taskForNewNode, isAtrasada, sortTasks, addDays, type Task } from '@/domain/tasks/rules'

const BASE = new Date('2026-09-18T12:00:00Z')

describe('taskForNewNode', () => {
  it('cria tarefa de D+3 ao adicionar landing page', () => {
    const t = taskForNewNode('n1', 'landing_page', 'LP GD Frete', BASE)
    expect(t).not.toBeNull()
    expect(t?.vencimento).toBe('2026-09-21')
    expect(t?.titulo).toBe('Conferir dados da Landing Page — LP GD Frete')
    expect(t?.origem).toBe('regra')
  })

  it('cria tarefa de D+1 para campanha paga', () => {
    expect(taskForNewNode('n2', 'meta_ads', 'Campanha teste', BASE)?.vencimento).toBe('2026-09-19')
  })

  it('não cria tarefa para tipos sem regra', () => {
    expect(taskForNewNode('n3', 'nota', 'Lembrete', BASE)).toBeNull()
    expect(taskForNewNode('n4', 'post', 'Post', BASE)).toBeNull()
  })

  it('atravessa a virada de mês corretamente', () => {
    expect(addDays(new Date('2026-09-30T00:00:00Z'), 3)).toBe('2026-10-03')
  })
})

describe('isAtrasada', () => {
  it('marca como atrasada quando venceu e está aberta', () => {
    expect(isAtrasada({ vencimento: '2026-09-17', status: 'aberta' }, BASE)).toBe(true)
  })
  it('não marca tarefa feita', () => {
    expect(isAtrasada({ vencimento: '2026-09-01', status: 'feita' }, BASE)).toBe(false)
  })
  it('não marca tarefa que vence hoje', () => {
    expect(isAtrasada({ vencimento: '2026-09-18', status: 'aberta' }, BASE)).toBe(false)
  })
})

describe('sortTasks', () => {
  it('coloca abertas antes de feitas e ordena por vencimento', () => {
    const tasks = [
      { vencimento: '2026-09-25', status: 'aberta' },
      { vencimento: '2026-09-01', status: 'feita' },
      { vencimento: '2026-09-19', status: 'aberta' },
    ] as Task[]
    const sorted = sortTasks(tasks)
    expect(sorted.map((t) => t.vencimento)).toEqual(['2026-09-19', '2026-09-25', '2026-09-01'])
  })
})
