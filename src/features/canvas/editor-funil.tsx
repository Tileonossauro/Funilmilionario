'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  useCanvasStore,
  SIMULACAO_INICIAL,
  type CanvasEdge,
  type CanvasNode,
  type EstadoSimulacao,
} from '@/features/canvas/store'
import { Canvas } from '@/features/canvas/canvas'
import { Biblioteca } from '@/features/canvas/biblioteca'
import { PainelPropriedades } from '@/features/canvas/painel-propriedades'
import { ThemeToggle } from '@/features/shell/theme-toggle'
import { renomearFunil, salvarSimulacao } from '@/app/funis/actions'
import { Button, Spinner } from '@/components/ui/primitives'
import { BarraSimulacao } from '@/features/canvas/barra-simulacao'

interface Props {
  funil: { id: string; nome: string }
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  simulacao: Record<string, unknown> | null
}

export function EditorFunil({ funil, nodes, edges, simulacao: salva }: Props) {
  const iniciar = useCanvasStore((s) => s.iniciar)
  const saveState = useCanvasStore((s) => s.saveState)
  const aviso = useCanvasStore((s) => s.aviso)
  const avisar = useCanvasStore((s) => s.avisar)
  const simulacao = useCanvasStore((s) => s.simulacao)
  const patchSimulacao = useCanvasStore((s) => s.patchSimulacao)
  const [nome, setNome] = useState(funil.nome)

  /**
   * Carrega o funil do servidor UMA vez por funil aberto.
   *
   * `nodes` e `edges` são props do servidor, e toda Server Action do Next
   * recarrega a rota por baixo — o que gera arrays novos a cada salvamento. Com
   * esses arrays na lista de dependências, o efeito rodava de novo e substituía
   * o store inteiro no meio da edição: etapa recém-criada sumia, node arrastado
   * voltava para a posição antiga. Enquanto o funil está aberto, quem manda no
   * estado é o cliente; o servidor é a origem só na abertura.
   */
  const funilCarregado = useRef<string | null>(null)
  useEffect(() => {
    if (funilCarregado.current === funil.id) return
    funilCarregado.current = funil.id
    iniciar(funil.id, nodes, edges, lerSimulacaoSalva(salva))
  }, [funil.id, nodes, edges, salva, iniciar])

  // O cenário é salvo com atraso: quem digita "10000" no tráfego gera cinco
  // estados intermediários, e nenhum deles precisa ir ao banco.
  const primeiraRenderizacao = useRef(true)
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    const t = setTimeout(() => void salvarSimulacao(funil.id, simulacao), 900)
    return () => clearTimeout(t)
  }, [funil.id, simulacao])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => avisar(null), 4000)
    return () => clearTimeout(t)
  }, [aviso, avisar])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-[var(--surface)] px-4">
        <Link
          href="/funis"
          className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          ← Funis
        </Link>

        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome !== funil.nome && void renomearFunil(funil.id, nome)}
          className="min-w-0 max-w-xs flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm font-medium outline-none hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)]"
        />

        <IndicadorSalvamento estado={saveState} />

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant={simulacao.ativa ? 'primary' : 'outline'}
            onClick={() => patchSimulacao({ ativa: !simulacao.ativa })}
            title="Projetar o funil antes de gastar"
          >
            Simular
          </Button>
          <Link
            href="/tarefas"
            className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            Tarefas
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Biblioteca />
        <Canvas funnelId={funil.id} />
        <PainelPropriedades funnelId={funil.id} />
      </div>

      <BarraSimulacao />

      {aviso ? (
        <div className="animate-in fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-[var(--surface)] px-3.5 py-2 text-xs shadow-lg">
          {aviso}
        </div>
      ) : null}
    </div>
  )
}

function IndicadorSalvamento({ estado }: { estado: string }) {
  if (estado === 'ocioso') return null

  const conteudo =
    estado === 'salvando' ? (
      <>
        <Spinner /> Salvando...
      </>
    ) : estado === 'erro' ? (
      <span className="text-[var(--danger)]">Erro ao salvar</span>
    ) : (
      <span className="text-[var(--ok)]">✓ Salvo</span>
    )

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
      {conteudo}
    </span>
  )
}


/**
 * O cenário salvo vem do banco como jsonb solto. Cada campo é conferido antes
 * de virar estado — schema antigo ou dado torto não pode quebrar o editor.
 */
function lerSimulacaoSalva(bruto: Record<string, unknown> | null): Partial<EstadoSimulacao> {
  if (!bruto) return {}

  const numero = (v: unknown, padrao: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : padrao

  const taxas = (v: unknown): Record<string, number> => {
    if (!v || typeof v !== 'object') return {}
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).filter(
        ([, valor]) => typeof valor === 'number' && valor >= 0 && valor <= 1,
      ) as [string, number][],
    )
  }

  return {
    ativa: bruto.ativa === true,
    entryNodeId: typeof bruto.entryNodeId === 'string' ? bruto.entryNodeId : null,
    volume: numero(bruto.volume, SIMULACAO_INICIAL.volume),
    investimento: numero(bruto.investimento, SIMULACAO_INICIAL.investimento),
    taxasNode: taxas(bruto.taxasNode),
    taxasEdge: taxas(bruto.taxasEdge),
  }
}
