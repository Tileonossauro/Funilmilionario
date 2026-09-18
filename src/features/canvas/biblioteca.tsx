'use client'

import { useState } from 'react'
import {
  FAMILIES,
  FAMILY_META,
  getNodeType,
  typesByFamily,
  type NodeType,
} from '@/domain/funnel/taxonomy'
import { Input } from '@/components/ui/primitives'
import { IconeEtapa } from '@/components/ui/icone-etapa'
import { cn } from '@/lib/cn'

const HUE: Record<string, string> = {
  violet: 'text-violet-600 dark:text-violet-400',
  amber: 'text-amber-600 dark:text-amber-400',
  sky: 'text-sky-600 dark:text-sky-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  rose: 'text-rose-600 dark:text-rose-400',
  slate: 'text-slate-600 dark:text-slate-400',
}

export function Biblioteca() {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-[var(--surface)]">
      <div className="border-b p-3">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar etapa..."
          className="h-8 text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {FAMILIES.map((family) => {
          const tipos = typesByFamily(family).filter(
            (t) => !termo || getNodeType(t).label.toLowerCase().includes(termo),
          )
          if (tipos.length === 0) return null

          return (
            <section key={family} className="mb-5">
              <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {FAMILY_META[family].label}
              </h3>
              <div className="space-y-0.5">
                {tipos.map((tipo) => (
                  <ItemBiblioteca key={tipo} tipo={tipo} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <p className="border-t px-3 py-2.5 text-[10px] leading-relaxed text-[var(--text-muted)]">
        Arraste para o canvas ou clique duas vezes para adicionar no centro.
      </p>
    </aside>
  )
}

function ItemBiblioteca({ tipo }: { tipo: NodeType }) {
  const def = getNodeType(tipo)
  const cor = HUE[FAMILY_META[def.family].hue] ?? HUE.slate!

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/gd-etapa', tipo)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDoubleClick={() => {
        window.dispatchEvent(new CustomEvent('gd:add-etapa', { detail: tipo }))
      }}
      title={def.taskRule ? `Cria tarefa: ${def.taskRule.titulo} (D+${def.taskRule.prazoDias})` : undefined}
      className={cn(
        'flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-xs',
        'transition-colors hover:bg-[var(--surface-2)] active:cursor-grabbing',
      )}
    >
      <IconeEtapa nome={def.icon} className={cn('size-4 shrink-0', cor)} />
      <span className="flex-1 truncate">{def.label}</span>
      {def.taskRule ? (
        <span
          className="text-[9px] text-[var(--text-muted)]"
          title={`Cria tarefa automática em D+${def.taskRule.prazoDias}`}
        >
          D+{def.taskRule.prazoDias}
        </span>
      ) : null}
    </div>
  )
}
