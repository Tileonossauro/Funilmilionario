# FUNNEL_SCHEMA.md — Modelo semântico do funil

Este é o documento mais importante do produto. Tudo — canvas, IA, lint, Funnel Math, export,
templates — fala esta linguagem.

> **Princípio (§2):** um node não é uma caixa. É uma etapa comercial com tipo, papel no
> funil e comportamento esperado. É isso que permite ao sistema dizer "existe teste grátis
> mas não existe ativação" sem que ninguém explique o que é ativação.

---

## 1. Taxonomia

### 1.1 Categorias (§9)

| id | Rótulo | Papel no funil |
|---|---|---|
| `acquisition` | Aquisição | traz desconhecido |
| `content` | Conteúdo | educa e gera intenção |
| `page` | Páginas | captura ou converte |
| `communication` | Comunicação | conversa com a pessoa |
| `crm` | CRM | qualifica e avança a venda |
| `product` | Produto | ativa e entrega valor |
| `revenue` | Receita | monetiza |
| `logic` | Lógica | ramifica, espera, automatiza |
| `organization` | Organização | anota, agrupa, documenta |

### 1.2 Estágios (`stage`) — o eixo que a IA e o lint realmente usam

```
traffic → interest → capture → qualification → conversion → activation → retention → expansion
```

Categoria é agrupamento visual na sidebar. **Stage é semântica.** Um node `whatsapp` pode
ser `qualification` num funil de vendas e `retention` num funil de pós-venda — por isso
`stage` é sobrescrevível pelo usuário, com default vindo do tipo.

### 1.3 Tipos

Cada tipo declara: `category`, `defaultStage`, `icon`, `terminal?`, `branching?`,
`defaultMetrics[]`, `requiresCta?`.

```
acquisition   meta_ads · google_ads · tiktok_ads · youtube_ads · instagram · tiktok
              youtube · seo · referral · outbound · cold_call
content       post · reel · story · video · article · creative · webinar · vsl
page          landing_page · sales_page · capture_page · checkout · thank_you · form
communication whatsapp · email · sms · call · chat · bot
crm           lead · mql · sql · opportunity · meeting · proposal · follow_up · sale
product       signup · free_trial · activation · onboarding · first_value · subscription
              upgrade · cancellation
revenue       sale_revenue · order_bump · upsell · downsell · renewal
logic         condition · delay · automation · webhook · integration · ab_split
organization  note · text · title · group · area · checklist
```

Anotações que mudam comportamento:
- `condition` e `ab_split` são `branching: true` → **exigem** ≥2 saídas; uma saída só é
  erro de lint, não estilo.
- `sale_revenue`, `subscription`, `cancellation`, `renewal` são `terminal: true` → não ter
  saída é legítimo. Os demais sem saída viram *dead end* (§15).
- `organization` fica fora de toda análise: não é etapa, não entra no math, não conta no lint.

O registry vive em `domain/funnel/taxonomy.ts`, **um objeto declarativo**. Adicionar tipo
novo é acrescentar uma entrada — não tocar em componente, lint ou IA.

---

## 2. Tipos TypeScript (fonte: Zod em `domain/funnel/schema.ts`)

### 2.1 Node

```ts
export interface FunnelNode {
  id: string                     // uuid
  type: FunnelNodeType
  category: FunnelCategory
  position: { x: number; y: number }
  size?: { width: number; height: number }
  groupId?: string | null
  zIndex?: number
  data: FunnelNodeData
}

export interface FunnelNodeData {
  label: string                  // "Instagram"
  stage: FunnelStage             // default do tipo, editável
  objective?: string             // "Educar e gerar intenção"
  description?: string
  owner?: string                 // §10 — texto livre no MVP
  cta?: string                   // "Teste grátis"
  url?: string
  notes?: string
  tags?: string[]
  checklist?: ChecklistItem[]
  status?: 'idea' | 'planned' | 'active' | 'paused' | 'done'
  metrics?: NodeMetrics
  icon?: string
  color?: string
  rev: number                    // incrementa a cada mutação — chave do memo (perf, §31)
}

export interface ChecklistItem { id: string; text: string; done: boolean }
```

`rev` não é enfeite: é o que faz `React.memo` comparar um número em vez de deep-equal de
objeto aninhado, 500 vezes por frame.

### 2.2 Métricas (§16) — planejado vs real

```ts
export interface MetricValue {
  value: number
  source: 'manual' | 'simulation' | 'integration'
  updatedAt?: string
  provider?: string              // 'rd_station' | 'meta_ads' | ... (§50)
}

export interface NodeMetrics {
  planned?: Partial<Record<MetricKey, MetricValue>>
  actual?:  Partial<Record<MetricKey, MetricValue>>
  target?:  Partial<Record<MetricKey, number>>    // "META 3%"
  primary?: MetricKey                              // qual aparece no card do node
}

export type MetricKey =
  | 'visitors' | 'clicks' | 'leads' | 'ctr' | 'cpc' | 'cpl'
  | 'conversion_rate' | 'sales' | 'cac' | 'revenue' | 'mrr' | 'churn'
  | 'activations' | 'trials' | 'customers'
```

Separar `planned` de `actual` é o que viabiliza o §49: *"seu mapa prevê 40% de ativação,
os dados indicam 27%"*. Num campo só, essa frase é impossível de produzir.

### 2.3 Edge (§11)

```ts
export interface FunnelEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  data: FunnelEdgeData
}

export interface FunnelEdgeData {
  label?: string                 // "Converteu?" · "SIM" · "NÃO"
  condition?: EdgeCondition
  lineType: 'straight' | 'bezier' | 'smoothstep' | 'step'
  marker: 'arrow' | 'arrowclosed' | 'none'
  animated?: boolean
  color?: string
  rate?: number                  // 0..1 — taxa de passagem (Funnel Math)
  rev: number
}

export interface EdgeCondition {
  kind: 'yes' | 'no' | 'timeout' | 'custom'
  expression?: string            // texto humano: "não respondeu em 24h"
}
```

A taxa mora na **edge**, não no node (ambiguidade #4 da ARCHITECTURE). Um node com duas
saídas — respondeu / não respondeu — tem duas taxas, e elas devem somar ≤ 1.

### 2.4 Grupo (§12)

```ts
export interface FunnelGroup {
  id: string
  data: {
    label: string                // "AQUISIÇÃO"
    stage?: FunnelStage
    color?: string
    collapsed: boolean
    rev: number
  }
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number                 // sempre atrás dos nodes
}
```

Grupo é container visual: mover o grupo move os nodes contidos; nodes referenciam via
`groupId`. Grupo não é pai no React Flow (nesting complica seleção e performance) — a
relação é resolvida no store.

### 2.5 Grafo completo

```ts
export interface FunnelGraph {
  schemaVersion: 1
  funnel: { id: string; name: string; description?: string; status: FunnelStatus }
  nodes: FunnelNode[]
  edges: FunnelEdge[]
  groups: FunnelGroup[]
  notes?: CanvasNote[]
  viewport: { x: number; y: number; zoom: number }
  simulation?: SimulationInput
}
```

`schemaVersion` existe desde o dia 1. É o que permite importar um JSON exportado há seis
meses (§19) sem quebrar — migrations de schema em `domain/funnel/migrations/`.

**Este objeto é o formato de export/import JSON do §19.** Não há formato paralelo.

---

## 3. Lint determinístico (§15)

Regras em código, não em prompt. Cada uma: `id`, `severity`, `title`, `detect(graph)`,
`suggestFix?`.

| id | Severidade | O que detecta |
|---|---|---|
| `orphan_node` | error | node sem entrada nem saída |
| `dead_end` | error | node não-terminal sem saída |
| `unreachable` | warning | não alcançável a partir de nenhum node de `traffic` |
| `branch_without_alternatives` | error | `condition`/`ab_split` com <2 saídas |
| `no_negative_path` | warning | captura/conversa sem caminho para quem não responde (§15) |
| `missing_cta` | warning | node de `content`/`page` sem `cta` |
| `missing_activation` | warning | existe `free_trial`/`signup` mas nenhum `activation` |
| `missing_onboarding` | info | há `subscription` sem `onboarding` |
| `missing_retention` | info | nenhum node com stage `retention` |
| `missing_remarketing` | info | páginas sem caminho de remarketing para quem não converteu |
| `missing_followup` | warning | `lead`/`whatsapp` sem `follow_up` a jusante |
| `missing_metrics` | info | node de conversão sem métrica definida |
| `missing_owner` | info | node ativo sem responsável |
| `rate_sum_exceeds` | error | saídas de um node com taxas somando > 1 |
| `cycle_without_delay` | warning | ciclo sem `delay` — loop infinito na simulação |

Roda em <5ms para 500 nodes (BFS/DFS simples), a cada mudança debounced, e alimenta:
o badge de problemas na UI, o `/bottlenecks`, e o contexto da IA.

**Por que isso importa:** a IA recebe o relatório de lint pronto. Ela não gasta raciocínio
contando arestas — gasta em *"você leva tráfego do Instagram direto pro WhatsApp sem etapa
de educação, e no seu ticket de R$29,90 isso derruba a taxa de resposta"*. Determinístico
acha o buraco; a IA explica o custo comercial dele.

---

## 4. Funnel Math (§17)

```ts
export interface SimulationInput {
  entryNodeId: string
  volume: number                 // 10.000
  ticket: number                 // 29.90
  currency: 'BRL'
  costPerClick?: number
  overrides?: Record<string, number>   // edgeId → taxa
}

export interface SimulationResult {
  perNode: Record<string, { in: number; out: number; converted: number; revenue?: number }>
  totals: { clicks: number; leads: number; activations: number; customers: number
            revenue: number; mrr: number; cac?: number; roas?: number }
  warnings: string[]
}
```

Algoritmo: ordenação topológica a partir do `entryNodeId`, propagação do volume pelas taxas
das edges. Ciclos com `delay` recebem limite de iteração; ciclo sem `delay` já foi pego pelo
lint. Nodes de `revenue` multiplicam volume × ticket.

Função pura, sem React, sem banco — 100% coberta por testes unitários. É a feature mais
fácil de errar silenciosamente e a mais visível quando erra na frente de um cliente.

O resultado é renderizado **sobre** o canvas em overlay (§17), sem alterar as métricas
salvas do node. Simulação é hipótese, não dado.

---

## 5. Contrato com a IA (§32)

### 5.1 O que enviamos

```json
{
  "project":  { "name": "GD Frete", "product": {}, "icp": {}, "offer": {} },
  "funnel":   { "id": "...", "name": "...", "nodeCount": 24 },
  "nodes":    [{ "id": "n1", "type": "instagram", "stage": "traffic",
                 "label": "Instagram", "cta": null, "metrics": {}, "outgoing": ["n2"] }],
  "edges":    [{ "id": "e1", "source": "n1", "target": "n2", "label": "bio", "rate": 0.08 }],
  "groups":   [{ "id": "g1", "label": "AQUISIÇÃO", "nodeIds": ["n1","n2"] }],
  "lint":     [{ "rule": "missing_activation", "severity": "warning", "nodeIds": [] }],
  "metrics":  { "planned": {}, "actual": {}, "sources": ["rd_station"] },
  "goals":    ["Maximizar ativações e assinaturas"],
  "uiState":  { "selectedNodeIds": ["n7"], "activePanel": "properties" }
}
```

Nodes vão numa forma **achatada e enxuta** — sem `position`, sem `rev`, sem `color`. A IA
não precisa de coordenadas para raciocinar sobre estratégia, e cada campo inútil é token.
Posições dos nodes novos são calculadas pelo nosso auto-layout no momento do preview.

### 5.2 O que a IA devolve

```json
{
  "analysis": [
    { "id": "a1", "severity": "high", "title": "Sem fluxo para trial abandonado",
      "finding": "...", "impact": "...", "recommendation": "...",
      "relatedNodeIds": ["n9"], "source": "inference" }
  ],
  "changeSet": {
    "rationale": "Adiciona régua de recuperação de trial expirado",
    "changes": [
      { "op": "add_node", "node": { "tempId": "t1", "type": "delay", "label": "D+1",
                                    "stage": "retention" } },
      { "op": "add_edge", "edge": { "source": "n9", "target": "t1", "label": "não assinou" } }
    ]
  }
}
```

### 5.3 Pipeline de validação — inegociável (§32, §33)

```
resposta → Zod.parse            falhou? retry com o erro; 2 falhas → mensagem honesta ao usuário
        → resolveTempIds        tempId → uuid real
        → validateAgainstGraph  ids referenciados existem? tipos na taxonomia? sem duplicata?
        → autoLayout            posiciona nodes novos sem sobrepor existentes
        → preview               fantasma no canvas: verde=novo, azul=alterado, vermelho=removido
        → [APLICAR] → snapshot de versão → transação única no store (um undo)
          [IGNORAR] → descarta
```

Nunca executamos texto do modelo direto no canvas. Nunca aplicamos sem passar por Zod.
Nunca aplicamos sem o clique.

---

## 6. Template GD Frete (§22)

Seed oficial. Estrutura que vai no `templates.graph`:

```
[GRUPO: AQUISIÇÃO]
  conteúdo_orgânico (content/reel) → perfil_instagram (instagram)
  perfil_instagram → bio (page/capture_page)
  bio → destaques (content/story)

[GRUPO: EDUCAÇÃO]  — ramificação dos destaques
  destaques → como_funciona · na_pratica · preco · resultados · duvidas   (5 stories)
  todos → cta_teste_gratis (content, cta: "Teste grátis por 7 dias")

[GRUPO: QUALIFICAÇÃO]
  cta_teste_gratis → whatsapp (communication)
  whatsapp → [condition: "respondeu?"]
       SIM → cadastro (product/signup)
       NÃO → follow_up_d1 → follow_up_d3 → retargeting (acquisition/meta_ads)

[GRUPO: ATIVAÇÃO]
  cadastro → primeiro_uso (product/first_value) → trial (product/free_trial)
  trial → [condition: "ativou?"]
       SIM → assinatura (product/subscription)
       NÃO → follow_up_trial → retargeting

[GRUPO: RETENÇÃO]
  assinatura → onboarding (product/onboarding) → retencao (product, stage: retention)
```

Escolhi montar assim — com as duas ramificações condicionais explícitas — porque o template
precisa *demonstrar* o diferencial do produto na primeira abertura. Um template linear não
mostraria nada que uma apresentação de slides já não mostre.

Todos os nodes vêm com `objective`, `cta` e `primary` metric preenchidos, e taxas plausíveis
nas edges — assim o Funnel Math funciona no primeiro clique, sem o usuário digitar nada.

---

## 7. Regras de evolução do schema

1. `schemaVersion` sobe a cada mudança incompatível; migration correspondente em
   `domain/funnel/migrations/`.
2. Tipo de node novo = uma entrada na taxonomia. Se exigir mexer em outro arquivo, o
   registry está errado.
3. Campo novo em `FunnelNodeData` nasce opcional. Import de JSON antigo nunca quebra.
4. Nada de campo com significado dependente de contexto ("meta" que às vezes é número, às
   vezes texto). Ambiguidade no schema vira bug na IA.
