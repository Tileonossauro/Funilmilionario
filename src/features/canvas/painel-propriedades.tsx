'use client'

import { useEffect, useState, useTransition } from 'react'
import { useCanvasStore } from '@/features/canvas/store'
import { getNodeType } from '@/domain/funnel/taxonomy'
import { METRIC_META, computeDerived, DERIVED_META, formatMetric, type MetricKey } from '@/domain/metrics/keys'
import { atualizarNode, excluirNode, historicoDaEtapa, criarTarefa } from '@/app/funis/actions'
import { Button, Input, Field, Textarea, Label } from '@/components/ui/primitives'
import { LancamentoForm } from '@/features/canvas/lancamento-form'
import { addDays } from '@/domain/tasks/rules'

type Aba = 'detalhes' | 'numeros'

interface Historico {
  id: string
  periodo_de: string
  periodo_ate: string
  valores: Record<string, number>
  origem: string
}

export function PainelPropriedades({ funnelId }: { funnelId: string }) {
  const selecionado = useCanvasStore((s) => s.selecionado)
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === s.selecionado))
  const patchNode = useCanvasStore((s) => s.patchNode)
  const removeNode = useCanvasStore((s) => s.removeNode)

  const [aba, setAba] = useState<Aba>('detalhes')
  const [historico, setHistorico] = useState<Historico[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!selecionado) return
    setAba('detalhes')
    let ativo = true
    historicoDaEtapa(selecionado).then((h) => {
      if (ativo) setHistorico(h as Historico[])
    })
    return () => {
      ativo = false
    }
  }, [selecionado])

  if (!node) {
    return (
      <aside className="flex w-72 shrink-0 items-center justify-center border-l bg-[var(--surface)] p-6">
        <p className="text-center text-xs leading-relaxed text-[var(--text-muted)]">
          Selecione uma etapa para ver
          <br />
          detalhes e lançar números.
        </p>
      </aside>
    )
  }

  const def = getNodeType(node.type)

  /** Escreve no banco em background; a UI já mostra o valor novo. */
  function salvar(patch: Record<string, unknown>) {
    patchNode(node!.id, patch)
    startTransition(() => {
      const atual = useCanvasStore.getState().nodes.find((n) => n.id === node!.id)
      if (!atual) return
      void atualizarNode(node!.id, {
        data: {
          label: atual.label,
          objetivo: atual.objetivo,
          url: atual.url,
          observacoes: atual.observacoes,
          ultimoLancamento: atual.ultimoLancamento,
          ultimoLancamentoEm: atual.ultimoLancamentoEm,
          rev: atual.rev,
        },
      })
    })
  }

  const valores = (node.ultimoLancamento ?? {}) as Partial<Record<MetricKey, number>>
  const derivadas = computeDerived(valores)

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l bg-[var(--surface)]">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{def.icon}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {def.label}
          </span>
        </div>
      </div>

      <div className="flex border-b">
        {(['detalhes', 'numeros'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={
              aba === t
                ? 'flex-1 border-b-2 border-[var(--accent)] py-2 text-xs font-medium text-[var(--text)]'
                : 'flex-1 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)]'
            }
          >
            {t === 'detalhes' ? 'Detalhes' : 'Números'}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {aba === 'detalhes' ? (
          <>
            <Field label="Nome">
              <Input
                value={node.label}
                onChange={(e) => patchNode(node.id, { label: e.target.value })}
                onBlur={(e) => salvar({ label: e.target.value })}
              />
            </Field>

            <Field label="Objetivo">
              <Textarea
                rows={2}
                value={node.objetivo ?? ''}
                placeholder="O que essa etapa precisa fazer"
                onChange={(e) => patchNode(node.id, { objetivo: e.target.value })}
                onBlur={(e) => salvar({ objetivo: e.target.value })}
              />
            </Field>

            <Field label="Link">
              <Input
                value={node.url ?? ''}
                placeholder="https://"
                onChange={(e) => patchNode(node.id, { url: e.target.value })}
                onBlur={(e) => salvar({ url: e.target.value })}
              />
            </Field>

            <Field label="Observações">
              <Textarea
                rows={3}
                value={node.observacoes ?? ''}
                onChange={(e) => patchNode(node.id, { observacoes: e.target.value })}
                onBlur={(e) => salvar({ observacoes: e.target.value })}
              />
            </Field>

            <NovaTarefa funnelId={funnelId} nodeId={node.id} nodeLabel={node.label} />

            <div className="border-t pt-4">
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                onClick={() => {
                  removeNode(node.id)
                  void excluirNode(node.id, funnelId)
                }}
              >
                Excluir etapa
              </Button>
            </div>
          </>
        ) : (
          <>
            {def.metrics.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Essa etapa não acompanha números.
              </p>
            ) : (
              <>
                {Object.keys(valores).length > 0 ? (
                  <div className="rounded-lg border p-3">
                    <Label>Último lançamento</Label>
                    <div className="space-y-1">
                      {(Object.keys(valores) as MetricKey[]).map((k) => {
                        const meta = METRIC_META[k]
                        const v = valores[k]
                        if (!meta || v === undefined) return null
                        return (
                          <Linha key={k} nome={meta.label} valor={formatMetric(v, meta.format)} />
                        )
                      })}
                      {(Object.keys(derivadas) as (keyof typeof derivadas)[]).map((k) => (
                        <Linha
                          key={k}
                          nome={DERIVED_META[k].label}
                          valor={formatMetric(derivadas[k]!, DERIVED_META[k].format)}
                          destaque
                        />
                      ))}
                    </div>
                    {node.ultimoLancamentoEm ? (
                      <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                        até {node.ultimoLancamentoEm}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <LancamentoForm
                  funnelId={funnelId}
                  nodeId={node.id}
                  nodeLabel={node.label}
                  metricas={def.metrics}
                  onRegistrado={(valores, ate) => {
                    patchNode(node.id, {
                      ultimoLancamento: valores,
                      ultimoLancamentoEm: ate,
                    })
                    void historicoDaEtapa(node.id).then((h) => setHistorico(h as Historico[]))
                  }}
                />

                {historico.length > 0 ? (
                  <div className="border-t pt-4">
                    <Label>Histórico</Label>
                    <ul className="space-y-1.5">
                      {historico.map((h) => (
                        <li key={h.id} className="rounded-lg bg-[var(--surface-2)] px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {h.periodo_de} → {h.periodo_ate}
                            </span>
                            {h.origem === 'screenshot' ? (
                              <span className="text-[9px] text-[var(--accent)]">print</span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            {Object.entries(h.valores).map(([k, v]) => {
                              const meta = METRIC_META[k as MetricKey]
                              if (!meta) return null
                              return (
                                <span key={k} className="text-[10px] tabular-nums">
                                  <span className="text-[var(--text-muted)]">{meta.label} </span>
                                  {formatMetric(v, meta.format)}
                                </span>
                              )
                            })}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  )
}

function Linha({ nome, valor, destaque }: { nome: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={destaque ? 'text-[11px] text-[var(--accent)]' : 'text-[11px] text-[var(--text-muted)]'}>
        {nome}
      </span>
      <span
        className={
          destaque
            ? 'text-xs font-semibold tabular-nums text-[var(--accent)]'
            : 'text-xs font-medium tabular-nums'
        }
      >
        {valor}
      </span>
    </div>
  )
}

function NovaTarefa({
  funnelId,
  nodeId,
  nodeLabel,
}: {
  funnelId: string
  nodeId: string
  nodeLabel: string
}) {
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [vencimento, setVencimento] = useState(addDays(new Date(), 3))
  const [salvando, setSalvando] = useState(false)
  const avisar = useCanvasStore((s) => s.avisar)

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => setAberto(true)}>
        + Criar tarefa nessa etapa
      </Button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Input
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={`Conferir ${nodeLabel}`}
        className="h-8 text-xs"
      />
      <Input
        type="date"
        value={vencimento}
        onChange={(e) => setVencimento(e.target.value)}
        className="h-8 text-xs"
      />
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="primary"
          className="flex-1"
          disabled={salvando}
          onClick={async () => {
            setSalvando(true)
            const r = await criarTarefa({ funnelId, nodeId, titulo, vencimento })
            setSalvando(false)
            if (r.ok) {
              setAberto(false)
              setTitulo('')
              avisar('Tarefa criada')
            } else {
              avisar(r.erro)
            }
          }}
        >
          Criar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
