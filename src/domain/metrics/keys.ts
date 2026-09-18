/**
 * Métricas do sistema. Duas naturezas, e a distinção é deliberada:
 *
 * - LANÇADAS: números que só existem se alguém informar (ou se a IA ler de um print).
 * - DERIVADAS: números que o sistema calcula. Nunca são digitados — deixar alguém
 *   digitar um CTR que discorda de cliques/impressões é fabricar inconsistência.
 */

export const METRIC_KEYS = [
  'investimento',
  'impressoes',
  'cliques',
  'visitantes',
  'leads',
  'conversas',
  'ativacoes',
  'vendas',
  'receita',
] as const

export type MetricKey = (typeof METRIC_KEYS)[number]

export const DERIVED_KEYS = ['ctr', 'conversao', 'cpl', 'cac', 'ticket'] as const

/** Exportado para o cálculo de fluxo, que precisa da mesma guarda contra zero. */
export { ratio as razaoSegura }
export type DerivedKey = (typeof DERIVED_KEYS)[number]

type Format = 'inteiro' | 'moeda' | 'percentual'

export const METRIC_META: Record<MetricKey, { label: string; format: Format }> = {
  investimento: { label: 'Investimento', format: 'moeda' },
  impressoes: { label: 'Impressões', format: 'inteiro' },
  cliques: { label: 'Cliques', format: 'inteiro' },
  visitantes: { label: 'Visitantes', format: 'inteiro' },
  leads: { label: 'Leads', format: 'inteiro' },
  conversas: { label: 'Conversas', format: 'inteiro' },
  ativacoes: { label: 'Ativações', format: 'inteiro' },
  vendas: { label: 'Vendas', format: 'inteiro' },
  receita: { label: 'Receita', format: 'moeda' },
}

export const DERIVED_META: Record<DerivedKey, { label: string; format: Format }> = {
  ctr: { label: 'CTR', format: 'percentual' },
  conversao: { label: 'Conversão', format: 'percentual' },
  cpl: { label: 'CPL', format: 'moeda' },
  cac: { label: 'CAC', format: 'moeda' },
  ticket: { label: 'Ticket médio', format: 'moeda' },
}

export type MetricValues = Partial<Record<MetricKey, number>>
export type DerivedValues = Partial<Record<DerivedKey, number>>

/** Divisão que devolve undefined em vez de Infinity/NaN. */
export function ratio(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined || b === undefined || b === 0) return undefined
  return a / b
}

export function computeDerived(v: MetricValues): DerivedValues {
  const out: DerivedValues = {}

  const ctr = ratio(v.cliques, v.impressoes)
  if (ctr !== undefined) out.ctr = ctr

  const cpl = ratio(v.investimento, v.leads)
  if (cpl !== undefined) out.cpl = cpl

  const cac = ratio(v.investimento, v.vendas)
  if (cac !== undefined) out.cac = cac

  const ticket = ratio(v.receita, v.vendas)
  if (ticket !== undefined) out.ticket = ticket

  return out
}

export function formatMetric(value: number, format: Format): string {
  switch (format) {
    case 'moeda':
      return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
      })
    case 'percentual':
      return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
    case 'inteiro':
      return Math.round(value).toLocaleString('pt-BR')
  }
}
