import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { extractionResultSchema, type ExtractionResult } from '@/domain/extraction/schema'
import { METRIC_META } from '@/domain/metrics/keys'
import {
  ExtractionError,
  type AIProvider,
  type ExtractMetricsInput,
} from '@/services/ai/provider'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5'

function buildPrompt(input: ExtractMetricsInput): string {
  const esperadas = input.metricasEsperadas
    .map((k) => `- ${k}: ${METRIC_META[k as keyof typeof METRIC_META]?.label ?? k}`)
    .join('\n')

  return `Você está lendo um print de painel de métricas (Instagram Insights, Gerenciador de Anúncios da Meta, Google Analytics, painel de checkout, etc).

Contexto da etapa do funil: ${input.contexto}

Extraia APENAS estas métricas, quando aparecerem no print:
${esperadas}

Regras rígidas:
1. Se uma métrica NÃO aparece no print, OMITA a chave. Nunca use 0 para dizer "não encontrei" — 0 é um valor real e válido.
2. Converta abreviações para número inteiro: "12,4 mil" = 12400, "1,2M" = 1200000, "R$ 1.234,56" = 1234.56.
3. Use ponto como separador decimal no JSON.
4. confianca: "alta" quando o rótulo no print corresponde claramente à métrica; "media" quando você inferiu pelo contexto; "baixa" quando o texto está cortado, borrado ou ambíguo.
5. textoOriginal: copie exatamente como apareceu no print.
6. Se o print não for um painel de métricas, devolva metricas vazio e preencha "aviso".
7. Não invente período. Só preencha "periodo" se estiver visível no print.

Responda SOMENTE com o JSON, sem texto antes ou depois, neste formato:
{
  "fonte": "Instagram Insights",
  "periodo": { "de": "2026-09-01", "ate": "2026-09-15", "textoOriginal": "1 - 15 de set" },
  "metricas": {
    "impressoes": { "valor": 12400, "confianca": "alta", "textoOriginal": "12,4 mil" }
  },
  "aviso": null
}`
}

/** Modelos às vezes embrulham JSON em cerca de markdown. Descasca antes do parse. */
function stripFence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

export class ClaudeProvider implements AIProvider {
  private readonly client: Anthropic

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new ExtractionError('ANTHROPIC_API_KEY não configurada no servidor.', 'sem_chave')
    }
    this.client = new Anthropic({ apiKey })
  }

  async extractMetrics(input: ExtractMetricsInput): Promise<ExtractionResult> {
    let raw: string
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: input.mediaType,
                  data: input.imageBase64,
                },
              },
              { type: 'text', text: buildPrompt(input) },
            ],
          },
        ],
      })

      const block = response.content.find((c) => c.type === 'text')
      if (!block || block.type !== 'text') {
        throw new ExtractionError('O modelo não devolveu texto.', 'resposta_invalida')
      }
      raw = block.text
    } catch (err) {
      if (err instanceof ExtractionError) throw err
      throw new ExtractionError(
        err instanceof Error ? err.message : 'Falha ao chamar o provider.',
        'falha_provider',
      )
    }

    let json: unknown
    try {
      json = JSON.parse(stripFence(raw))
    } catch {
      throw new ExtractionError('O modelo devolveu algo que não é JSON.', 'resposta_invalida')
    }

    // Validação é inegociável: nada chega à tela de conferência sem passar pelo schema.
    const parsed = extractionResultSchema.safeParse(json)
    if (!parsed.success) {
      throw new ExtractionError(
        `Resposta fora do contrato: ${parsed.error.issues[0]?.message ?? 'desconhecido'}`,
        'resposta_invalida',
      )
    }

    return parsed.data
  }
}

let cached: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (!cached) cached = new ClaudeProvider()
  return cached
}
