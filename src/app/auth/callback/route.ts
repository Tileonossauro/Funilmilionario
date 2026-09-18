import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Destino do link de confirmação de e-mail. O Supabase manda a pessoa para cá
 * com um `code`; aqui ele vira sessão e a pessoa entra direto no app.
 *
 * Sem esta rota, o link do e-mail cai numa página que não sabe o que fazer com
 * o código e a conta fica confirmada mas sem login.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const erroDescricao = searchParams.get('error_description')

  if (erroDescricao) {
    return NextResponse.redirect(`${origin}/entrar?erro=${encodeURIComponent(erroDescricao)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/entrar?erro=${encodeURIComponent('Link expirado ou já usado. Faça login.')}`,
    )
  }

  return NextResponse.redirect(`${origin}/funis`)
}
