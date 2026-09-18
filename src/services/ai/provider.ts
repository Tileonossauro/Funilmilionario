import 'server-only'

import type { ExtractionResult } from '@/domain/extraction/schema'

/**
 * Camada fina de provider. Hoje só existe leitura de print — a única coisa que a IA
 * faz neste MVP. A interface existe para que trocar de modelo/fornecedor depois não
 * vire caçada por chamadas espalhadas pelos componentes.
 */
export interface AIProvider {
  extractMetrics(input: ExtractMetricsInput): Promise<ExtractionResult>
}

export interface ExtractMetricsInput {
  /** Imagem em base64, sem o prefixo data:. */
  imageBase64: string
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp'
  /** Métricas que fazem sentido na etapa — restringe o que a IA deve procurar. */
  metricasEsperadas: string[]
  /** Contexto curto: "Landing Page — LP GD Frete". */
  contexto: string
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly code: 'sem_chave' | 'resposta_invalida' | 'falha_provider',
  ) {
    super(message)
    this.name = 'ExtractionError'
  }
}
