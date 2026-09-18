'use client'

import { useRef, useState } from 'react'
import { METRIC_META, type MetricKey } from '@/domain/metrics/keys'
import type { ExtractionResult } from '@/domain/extraction/schema'
import { registrarLancamento } from '@/app/funis/actions'
import { Button, Input, Label, Spinner } from '@/components/ui/primitives'
import { addDays } from '@/domain/tasks/rules'
import { cn } from '@/lib/cn'

interface Props {
  funnelId: string
  nodeId: string
  nodeLabel: string
  metricas: readonly MetricKey[]
  onRegistrado: (valores: Record<string, number>, ate: string) => void
}

type Origem = 'manual' | 'screenshot'

const MAX_MB = 6

export function LancamentoForm({ funnelId, nodeId, nodeLabel, metricas, onRegistrado }: Props) {
  const hoje = new Date().toISOString().slice(0, 10)
  const [de, setDe] = useState(addDays(new Date(), -7))
  const [ate, setAte] = useState(hoje)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [origem, setOrigem] = useState<Origem>('manual')
  const [revisar, setRevisar] = useState<MetricKey[]>([])
  const [fonte, setFonte] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const inputFile = useRef<HTMLInputElement>(null)

  function aplicarExtracao(resultado: ExtractionResult, paraRevisar: MetricKey[]) {
    const novos: Record<string, string> = {}
    for (const [chave, campo] of Object.entries(resultado.metricas)) {
      if (campo) novos[chave] = String(campo.valor)
    }
    setCampos((atual) => ({ ...atual, ...novos }))
    setRevisar(paraRevisar)
    setOrigem('screenshot')
    setFonte(resultado.fonte ?? null)

    if (resultado.periodo?.de) setDe(resultado.periodo.de)
    if (resultado.periodo?.ate) setAte(resultado.periodo.ate)

    if (Object.keys(novos).length === 0) {
      setErro(resultado.aviso ?? 'Não consegui achar números nesse print. Preencha na mão.')
    }
  }

  async function lerPrint(file: File) {
    setErro(null)

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErro('Envie uma imagem PNG, JPG ou WebP.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setErro(`Imagem acima de ${MAX_MB}MB.`)
      return
    }

    setLendo(true)
    try {
      const base64 = await paraBase64(file)
      const resposta = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type,
          metricasEsperadas: metricas,
          contexto: nodeLabel,
        }),
      })

      const json = await resposta.json()
      if (!resposta.ok) {
        setErro(
          json.code === 'sem_chave'
            ? 'A leitura de print precisa da ANTHROPIC_API_KEY configurada no servidor.'
            : (json.erro ?? 'Não consegui ler o print.'),
        )
        return
      }

      aplicarExtracao(json.resultado as ExtractionResult, (json.revisar ?? []) as MetricKey[])
    } catch {
      setErro('Falha ao enviar a imagem.')
    } finally {
      setLendo(false)
    }
  }

  async function registrar() {
    setErro(null)

    const valores: Record<string, number> = {}
    for (const [chave, texto] of Object.entries(campos)) {
      if (texto.trim() === '') continue
      const numero = Number(texto.replace(',', '.'))
      if (!Number.isFinite(numero) || numero < 0) {
        setErro(`Valor inválido em ${METRIC_META[chave as MetricKey]?.label ?? chave}.`)
        return
      }
      valores[chave] = numero
    }

    if (Object.keys(valores).length === 0) {
      setErro('Preencha ao menos um número.')
      return
    }

    setSalvando(true)
    const r = await registrarLancamento({
      nodeId,
      funnelId,
      periodoDe: de,
      periodoAte: ate,
      valores,
      origem,
    })
    setSalvando(false)

    if (!r.ok) {
      setErro(r.erro)
      return
    }

    onRegistrado(valores, ate)
    setCampos({})
    setRevisar([])
    setFonte(null)
    setOrigem('manual')
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          const file = e.dataTransfer.files[0]
          if (file) void lerPrint(file)
        }}
        onClick={() => inputFile.current?.click()}
        className={cn(
          'cursor-pointer rounded-lg border border-dashed px-3 py-4 text-center transition-colors',
          arrastando ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'hover:border-[var(--text-muted)]',
        )}
      >
        {lendo ? (
          <p className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <Spinner /> Lendo os números...
          </p>
        ) : (
          <>
            <p className="text-xs font-medium">Jogue o print aqui</p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
              Instagram, Meta Ads, Analytics — eu leio os números
            </p>
          </>
        )}
        <input
          ref={inputFile}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void lerPrint(file)
            e.target.value = ''
          }}
        />
      </div>

      {origem === 'screenshot' ? (
        <div className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-2">
          <p className="text-[10px] leading-relaxed text-[var(--text)]">
            {fonte ? <strong>{fonte}. </strong> : null}
            Confira os valores abaixo antes de salvar.
            {revisar.length > 0 ? ' Os marcados eu li com menos certeza.' : null}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>De</Label>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label>Até</Label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>

      <div className="space-y-2">
        {metricas.map((chave) => {
          const meta = METRIC_META[chave]
          const precisaRevisar = revisar.includes(chave)
          return (
            <div key={chave}>
              <Label className={precisaRevisar ? 'text-[var(--warn)]' : undefined}>
                {meta.label}
                {precisaRevisar ? ' — confira' : ''}
              </Label>
              <Input
                inputMode="decimal"
                value={campos[chave] ?? ''}
                placeholder="—"
                onChange={(e) => setCampos((c) => ({ ...c, [chave]: e.target.value }))}
                className={cn('h-8 text-xs tabular-nums', precisaRevisar && 'border-[var(--warn)]')}
              />
            </div>
          )
        })}
      </div>

      {erro ? (
        <p className="rounded-lg bg-[var(--danger)]/10 px-2.5 py-2 text-[10px] text-[var(--danger)]">
          {erro}
        </p>
      ) : null}

      <Button variant="primary" size="sm" className="w-full" onClick={registrar} disabled={salvando}>
        {salvando ? <Spinner /> : null}
        Registrar lançamento
      </Button>
    </div>
  )
}

function paraBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const resultado = String(reader.result)
      const virgula = resultado.indexOf(',')
      resolve(virgula >= 0 ? resultado.slice(virgula + 1) : resultado)
    }
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}
