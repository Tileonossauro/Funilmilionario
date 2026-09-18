import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/supabase/server'
import { getAIProvider } from '@/services/ai/claude-provider'
import { ExtractionError } from '@/services/ai/provider'
import { camposParaRevisar } from '@/domain/extraction/schema'
import { METRIC_KEYS } from '@/domain/metrics/keys'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 6 * 1024 * 1024

const bodySchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  metricasEsperadas: z.array(z.enum(METRIC_KEYS as unknown as [string, ...string[]])).min(1),
  contexto: z.string().max(200),
})

export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    )
  }

  // base64 infla ~33%; comparar aqui evita mandar imagem gigante para o provider.
  if (parsed.data.imageBase64.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ erro: 'Imagem acima de 6MB.' }, { status: 413 })
  }

  try {
    const result = await getAIProvider().extractMetrics(parsed.data)
    return NextResponse.json({ resultado: result, revisar: camposParaRevisar(result) })
  } catch (err) {
    if (err instanceof ExtractionError) {
      const status = err.code === 'sem_chave' ? 503 : 502
      return NextResponse.json({ erro: err.message, code: err.code }, { status })
    }
    return NextResponse.json({ erro: 'Falha inesperada na leitura.' }, { status: 500 })
  }
}
