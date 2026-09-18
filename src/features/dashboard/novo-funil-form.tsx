'use client'

import { useState, useRef, useEffect } from 'react'
import { criarFunil } from '@/app/funis/actions'
import { Button, Input } from '@/components/ui/primitives'

export function NovoFunilForm() {
  const [aberto, setAberto] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto) inputRef.current?.focus()
  }, [aberto])

  if (!aberto) {
    return (
      <Button variant="primary" onClick={() => setAberto(true)}>
        + Novo funil
      </Button>
    )
  }

  return (
    <form action={criarFunil} className="flex items-center gap-2">
      <Input
        ref={inputRef}
        name="nome"
        placeholder="Nome do funil"
        className="w-52"
        onKeyDown={(e) => e.key === 'Escape' && setAberto(false)}
      />
      <Button type="submit" variant="primary">
        Criar
      </Button>
      <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
        Cancelar
      </Button>
    </form>
  )
}
