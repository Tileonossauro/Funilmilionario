import Link from 'next/link'
import { sair } from '@/app/funis/actions'
import { ThemeToggle } from '@/features/shell/theme-toggle'

export function AppHeader({ tarefasVencidas = 0 }: { tarefasVencidas?: number }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-5 px-6">
        <Link href="/funis" className="text-sm font-semibold tracking-tight">
          GD Funnel Builder
        </Link>

        <nav className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
          <Link href="/funis" className="transition-colors hover:text-[var(--text)]">
            Funis
          </Link>
          <Link
            href="/tarefas"
            className="flex items-center gap-1.5 transition-colors hover:text-[var(--text)]"
          >
            Tarefas
            {tarefasVencidas > 0 ? (
              <span className="rounded-full bg-[var(--danger)] px-1.5 py-px text-[10px] font-semibold text-white">
                {tarefasVencidas}
              </span>
            ) : null}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <form action={sair}>
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
