'use client'

import { cn } from '@/lib/cn'
import { forwardRef } from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'outline', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium',
        'transition-colors duration-100 outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        variant === 'primary' && 'bg-[var(--accent)] text-white hover:opacity-90',
        variant === 'outline' &&
          'border bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]',
        variant === 'ghost' && 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        variant === 'danger' && 'text-[var(--danger)] hover:bg-[var(--danger)]/10',
        className,
      )}
      {...props}
    />
  )
})

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-lg border bg-[var(--surface)] px-3 text-sm text-[var(--text)]',
          'placeholder:text-[var(--text-muted)] outline-none transition-colors',
          'focus:border-[var(--accent)]',
          className,
        )}
        {...props}
      />
    )
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-y rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]',
        'placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent)]',
        className,
      )}
      {...props}
    />
  )
})

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label
      className={cn(
        'mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]',
        className,
      )}
    >
      {children}
    </label>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao: string
  acao?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center">
      <p className="text-sm font-medium text-[var(--text)]">{titulo}</p>
      <p className="max-w-sm text-sm text-[var(--text-muted)]">{descricao}</p>
      {acao ? <div className="mt-3">{acao}</div> : null}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent',
        className,
      )}
      aria-hidden
    />
  )
}
