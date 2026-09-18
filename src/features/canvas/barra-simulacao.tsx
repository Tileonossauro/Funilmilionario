'use client'

import { useCanvasStore, calcularSimulacao } from '@/features/canvas/store'
import { getNodeType } from '@/domain/funnel/taxonomy'
import { formatMetric } from '@/domain/metrics/keys'
import { Input, Label } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'

export function BarraSimulacao() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const simulacao = useCanvasStore((s) => s.simulacao)
  const patchSimulacao = useCanvasStore((s) => s.patchSimulacao)

  if (!simulacao.ativa) return null

  const resultado = calcularSimulacao(nodes, edges, simulacao)
  const totais = resultado?.totais
  const temPreco = nodes.some((n) => n.preco !== undefined)

  return (
    <div className="animate-in shrink-0 border-t bg-[var(--surface)] px-4 py-3">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="w-36">
          <Label>Entra por</Label>
          <select
            value={simulacao.entryNodeId ?? ''}
            onChange={(e) => patchSimulacao({ entryNodeId: e.target.value || null })}
            className="h-8 w-full rounded-lg border bg-[var(--surface)] px-2 text-xs outline-none focus:border-[var(--accent)]"
          >
            <option value="">Escolha a etapa</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label} · {getNodeType(n.type).label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-28">
          <Label>Tráfego</Label>
          <Input
            inputMode="numeric"
            value={String(simulacao.volume)}
            onChange={(e) => patchSimulacao({ volume: Math.max(0, Number(e.target.value) || 0) })}
            className="h-8 text-xs tabular-nums"
          />
        </div>

        <div className="w-32">
          <Label>Investimento</Label>
          <Input
            inputMode="decimal"
            value={String(simulacao.investimento)}
            onChange={(e) =>
              patchSimulacao({
                investimento: Math.max(0, Number(e.target.value.replace(',', '.')) || 0),
              })
            }
            className="h-8 text-xs tabular-nums"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          <Total rotulo="Vendas" valor={totais ? formatMetric(totais.vendas, 'inteiro') : '—'} />
          <Total
            rotulo="Receita"
            valor={totais ? formatMetric(totais.receita, 'moeda') : '—'}
            destaque
          />
          <Total
            rotulo="Lucro"
            valor={totais ? formatMetric(totais.lucro, 'moeda') : '—'}
            negativo={Boolean(totais && totais.lucro < 0)}
          />
          <Total
            rotulo="CAC"
            valor={totais?.cac !== undefined ? formatMetric(totais.cac, 'moeda') : '—'}
          />
          <Total
            rotulo="ROAS"
            valor={totais?.roas !== undefined ? `${totais.roas.toFixed(2)}x` : '—'}
          />
        </div>
      </div>

      {!temPreco ? (
        <p className="mt-2.5 text-[11px] text-[var(--warn)]">
          Nenhuma etapa tem preço, então a receita fica zerada. Adicione uma etapa
          <strong> Oferta</strong> (ou ponha preço no checkout / assinatura) para ver o dinheiro.
        </p>
      ) : null}

      {resultado && resultado.avisos.length > 0 ? (
        <ul className="mt-2 space-y-0.5">
          {resultado.avisos.map((aviso) => (
            <li key={aviso} className="text-[11px] text-[var(--text-muted)]">
              {aviso}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Total({
  rotulo,
  valor,
  destaque,
  negativo,
}: {
  rotulo: string
  valor: string
  destaque?: boolean
  negativo?: boolean
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{rotulo}</p>
      <p
        className={cn(
          'text-sm font-semibold tabular-nums',
          destaque && 'text-[var(--accent)]',
          negativo && 'text-[var(--danger)]',
        )}
      >
        {valor}
      </p>
    </div>
  )
}
