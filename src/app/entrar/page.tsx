'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Field, Spinner } from '@/components/ui/primitives'

export default function EntrarPage() {
  return (
    <Suspense fallback={<TelaVazia />}>
      <FormularioEntrar />
    </Suspense>
  )
}

/** Mesma moldura da tela real, para não piscar layout diferente no carregamento. */
function TelaVazia() {
  return <main className="flex min-h-screen items-center justify-center px-4" />
}

function FormularioEntrar() {
  const router = useRouter()
  const erroDaUrl = useSearchParams().get('erro')
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [confirmeEmail, setConfirmeEmail] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const supabase = createClient()
    const { data, error } =
      modo === 'entrar'
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({
            email,
            password: senha,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          })

    if (error) {
      setErro(traduzir(error.message))
      setCarregando(false)
      return
    }

    // Com confirmação de e-mail ligada, o cadastro volta SEM sessão. Mandar para
    // /funis aqui faria o middleware chutar de volta para cá sem explicação
    // nenhuma — a pessoa cadastra e acha que deu errado.
    if (!data.session) {
      setConfirmeEmail(true)
      setCarregando(false)
      return
    }

    router.push('/funis')
    router.refresh()
  }

  if (confirmeEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm animate-in text-center">
          <h1 className="text-lg font-semibold tracking-tight">Confirme seu e-mail</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Mandamos um link para <strong className="text-[var(--text)]">{email}</strong>.
            Clique nele para entrar. Se não chegar em alguns minutos, olhe o spam.
          </p>
          <Button
            variant="ghost"
            className="mt-6"
            onClick={() => {
              setConfirmeEmail(false)
              setModo('entrar')
            }}
          >
            Voltar para o login
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in">
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight">GD Funnel Builder</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Monte a jornada, acompanhe os números.
          </p>
        </div>

        <form onSubmit={submeter} className="space-y-4">
          <Field label="E-mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="voce@empresa.com"
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              placeholder="mínimo 6 caracteres"
            />
          </Field>

          {erro || erroDaUrl ? (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              {erro ?? erroDaUrl}
            </p>
          ) : null}

          <Button type="submit" variant="primary" className="w-full" disabled={carregando}>
            {carregando ? <Spinner /> : null}
            {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setModo(modo === 'entrar' ? 'criar' : 'entrar')
            setErro(null)
          }}
          className="mt-5 w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          {modo === 'entrar' ? 'Não tenho conta ainda' : 'Já tenho conta'}
        </button>
      </div>
    </main>
  )
}

function traduzir(mensagem: string): string {
  if (mensagem.includes('Invalid login')) return 'E-mail ou senha incorretos.'
  if (mensagem.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (mensagem.includes('rate limit') || mensagem.includes('after'))
    return 'Muitas tentativas. Espere um pouco e tente de novo.'
  if (mensagem.includes('already registered')) return 'Esse e-mail já tem conta.'
  if (mensagem.includes('Password should be')) return 'A senha precisa de pelo menos 6 caracteres.'
  return mensagem
}
