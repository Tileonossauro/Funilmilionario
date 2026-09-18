'use client'

import { useEffect, useState } from 'react'

type Tema = 'light' | 'dark' | 'system'

const ORDEM: Tema[] = ['system', 'light', 'dark']
const ICONE: Record<Tema, string> = { system: '◐', light: '○', dark: '●' }
const TITULO: Record<Tema, string> = { system: 'Tema do sistema', light: 'Tema claro', dark: 'Tema escuro' }

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>('system')

  useEffect(() => {
    const salvo = (localStorage.getItem('tema') as Tema | null) ?? 'system'
    setTema(salvo)
  }, [])

  useEffect(() => {
    const aplicar = () => {
      const escuro =
        tema === 'dark' ||
        (tema === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', escuro)
    }
    aplicar()
    localStorage.setItem('tema', tema)

    if (tema !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [tema])

  return (
    <button
      type="button"
      title={TITULO[tema]}
      aria-label={TITULO[tema]}
      onClick={() => setTema(ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length]!)}
      className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
    >
      {ICONE[tema]}
    </button>
  )
}
