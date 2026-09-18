# ARCHITECTURE.md — GD Funnel Builder

> Documento de arquitetura. Escrito **antes** da implementação, conforme §37 do PRD.
> Status: proposta para aprovação. Nenhuma linha de código de produto foi escrita ainda.

---

## 1. Resumo em uma frase

GD Funnel Builder é um **editor visual de funis com semântica comercial**, onde cada node
não é uma caixa de fluxograma e sim uma etapa de aquisição/venda tipada, e onde um agente
Claude opera como camada de inteligência sobre esse grafo — lendo, analisando e **propondo**
alterações que o usuário aprova.

O grafo é a fonte de verdade. A IA nunca vê screenshot; vê JSON semântico.

---

## 2. Princípios de arquitetura

Cinco regras que decidem discussões futuras:

1. **O grafo é dado, não pixel.** Toda feature (IA, math, lint, export, share) consome o
   mesmo `FunnelGraph` tipado. Nada lê o DOM do canvas.
2. **Determinístico antes de probabilístico.** Node órfão, dead end, etapa sem CTA, funil
   sem retenção — isso é *lint*, código puro, instantâneo e grátis. A IA cuida de
   interpretação estratégica (§15). Não gastamos token com o que um `for` resolve.
3. **A IA propõe, o usuário aplica.** Toda saída de agente que toca o canvas vira um
   `ChangeSet` validado por schema, renderizado como preview. Nunca mutação direta (§33).
4. **Segredo nunca cruza a fronteira do servidor.** Anthropic API key, tokens MCP e chaves
   BYOK vivem apenas server-side, criptografados. O frontend nunca recebe, nem mascarado.
5. **Camadas não vazam.** `ui/` não importa `data/`. `domain/` não importa React nem
   Supabase. Isso é o que permite testar o coração do produto sem browser e sem banco.

---

## 3. Stack — decisão e justificativa

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 15, App Router, RSC** | Route Handlers dão a fronteira server-side obrigatória para a Anthropic API e MCP. Server Components carregam dashboard sem waterfall de client fetch. |
| Linguagem | **TypeScript strict** | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Sem `any` em `domain/`. |
| UI | **Tailwind v4 + shadcn/ui + Radix** | shadcn é código nosso no repo, não dependência opaca — dá o acabamento "Linear/Raycast" sem herdar tema de terceiro. |
| Canvas | **@xyflow/react v12** | Maduro, headless o suficiente para nodes custom, viewport controlado, minimap e `onlyRenderVisibleElements` para os 500 nodes do §31. |
| Estado do canvas | **Zustand + Immer + zundo** | Store fora do React → drag não re-renderiza a árvore. `zundo` dá undo/redo temporal com agrupamento de ações (§8). |
| Server state | **TanStack Query** | Cache, invalidação e optimistic update para dashboard/versões. Não gerencia o canvas. |
| Validação | **Zod** | Um schema serve três donos: runtime do app, contrato da IA e geração de JSON Schema para tools. |
| Banco / Auth | **Supabase (Postgres 15 + Auth + RLS + Storage)** | RLS resolve o isolamento multi-workspace do §26 no nível certo — no banco, não no controller. |
| IA | **@anthropic-ai/sdk** atrás de `AIProvider` | Interface desacoplada (§3), implementação Claude como default. |
| Animação | **Motion (framer-motion)** | Microinterações discretas do §23. |
| Testes | **Vitest + Testing Library + Playwright** | Vitest cobre `domain/` (math, lint, changeset, schema). Playwright cobre os fluxos críticos de canvas. |

### O que *não* entra agora
Realtime colaborativo multi-cursor, integrações diretas de Ads/CRM (§35), mobile app,
editor de templates público. Arquitetura preparada, escopo fechado.

---

## 4. Desenho de camadas

```
┌─────────────────────────────────────────────────────────────┐
│  app/           Next.js routes — RSC, Route Handlers         │
│                 Fina. Orquestra, não decide.                 │
├─────────────────────────────────────────────────────────────┤
│  features/      Vertical slices de UI                        │
│                 canvas/ dashboard/ agent/ metrics/ share/    │
├─────────────────────────────────────────────────────────────┤
│  components/    Design system (shadcn) — burro, reutilizável │
├─────────────────────────────────────────────────────────────┤
│  domain/        ★ CORAÇÃO — puro, sem React, sem Supabase    │
│                 funnel/ (schema, graph ops, taxonomy)        │
│                 lint/   (detecção determinística §15)        │
│                 math/   (funnel math §17)                    │
│                 changeset/ (diff, apply, preview §33)        │
├─────────────────────────────────────────────────────────────┤
│  services/ai/   Agente — SERVER ONLY                         │
│                 claude-provider / agent-service /            │
│                 agent-context / tool-registry / mcp-manager  │
├─────────────────────────────────────────────────────────────┤
│  data/          Repositórios Supabase, mapeamento DB↔domain  │
└─────────────────────────────────────────────────────────────┘
```

Regra de import, validada por ESLint (`eslint-plugin-boundaries`):

```
app → features → components → domain
app → services → domain
app → data → domain
domain → (nada)
features ↛ data        (passa por Server Action ou Route Handler)
features ↛ services/ai (passa por /api/agent)
```

`services/ai/**` e `data/**/server.ts` carregam `import 'server-only'`. Um import acidental
em Client Component quebra o build — não vira vazamento de chave em produção.

---

## 5. Arquitetura do canvas

### 5.1 O problema real
XYFlow re-renderiza nodes quando o array de nodes muda de identidade. Com 500 nodes e um
drag a 60fps, ingenuidade custa a experiência inteira. As decisões abaixo existem por isso.

### 5.2 Store
Store Zustand único por funil aberto:

```ts
interface CanvasStore {
  funnelId: string
  nodes: FunnelNode[]          // domain types, não tipos do XYFlow
  edges: FunnelEdge[]
  groups: FunnelGroup[]
  selection: { nodeIds: string[]; edgeIds: string[] }
  viewport: Viewport
  preview: ChangeSetPreview | null   // proposta da IA, ainda não aplicada
  dirty: boolean
  saveState: 'idle' | 'saving' | 'saved' | 'error'
}
```

Regras de performance:
- Componentes assinam com seletor + `shallow`. Nenhum componente assina o store inteiro.
- Todo node custom é `memo` com comparador por `id + data.rev`. Mover o node A não
  re-renderiza B.
- `onlyRenderVisibleElements` acima de 150 nodes; abaixo disso o custo de cálculo não paga.
- Drag intermediário não vai ao store global — só o `onNodeDragStop` commita (e só ele
  entra no histórico de undo).
- Painel de propriedades é *uncontrolled* com commit em blur/debounce. Digitar um nome não
  dispara render do canvas.

Meta mensurável: **60fps de drag com 500 nodes**, medida em teste Playwright com trace.
Se não bater, viramos virtualização manual antes de adicionar features.

### 5.3 Undo/redo
`zundo` com *partialize* — só `nodes/edges/groups` entram no histórico; viewport e seleção
não (ninguém quer desfazer um zoom). Ações agrupadas por transação: colar 12 nodes é **um**
undo, não doze. Limite de 100 passos.

### 5.4 Autosave (§25)
```
mutação → dirty=true → debounce 1200ms (e flush em blur/unload)
        → diff contra último snapshot salvo
        → RPC save_funnel_graph(funnel_id, diff, base_version)
        → 'Salvando…' → '✓ Salvo'
```
Enviamos **diff**, não o grafo inteiro: mover um node num funil de 500 não deve trafegar
400KB. `base_version` dá optimistic concurrency — se outra aba salvou antes, o servidor
rejeita e a UI reconcilia em vez de sobrescrever silenciosamente.

Nunca bloqueia a edição. Erro de save vira toast persistente + retry com backoff, e o grafo
fica em `localStorage` como rede de segurança até confirmar.

---

## 6. Arquitetura da IA / agente

### 6.1 Fronteira
```
Client  ──POST /api/agent/chat (SSE)──▶  Route Handler
                                          ↓ auth + rate limit + quota
                                        AgentService
                                          ↓
                          ┌───────────────┼────────────────┐
                    ContextEngine    ToolRegistry      MCPManager
                          ↓               ↓                ↓
                   buildAgentContext  internal tools   servidores externos
                                          ↓
                                    ClaudeProvider (AIProvider)
                                          ↓
                                    Anthropic Messages API
```
Nenhum componente React importa `@anthropic-ai/sdk`. A chave existe apenas como env no
servidor (§40, §58).

### 6.2 `AIProvider` (§3)
```ts
interface AIProvider {
  generateFunnel(input: GenerateFunnelInput): Promise<ChangeSet>
  analyzeFunnel(input: AnalyzeInput): Promise<FunnelAnalysis>
  improveFunnel(input: ImproveInput): Promise<ChangeSet>
  generateCopy(input: CopyInput): Promise<CopyResult>
  chat(input: ChatInput): AsyncIterable<AgentEvent>   // loop agêntico com tools
}
```
Claude é a implementação default. Trocar provider é trocar uma linha de factory.

### 6.3 Context Engine (§42, §53, §56)
Não empurramos o mundo a cada mensagem. Pipeline:

```
mensagem → detectIntent() → selectContext(budget) → selectTools() → Claude
```

`buildAgentContext()` monta slices com orçamento de tokens:

| Slice | Quando entra |
|---|---|
| `project` + `ProjectMemory` | sempre (compacto: produto, ICP, oferta, preço, metas, decisões) |
| `uiState` (currentFunnelId, selectedNodeIds, viewport, activePanel) | sempre |
| `selection` — nodes selecionados **+ vizinhança de 1 salto** | quando há seleção |
| `funnel` completo | intents estruturais (analyze, improve, bottlenecks) |
| `funnel` resumido (contagens + grupos + nomes) | intents conversacionais |
| `lintReport` (determinístico) | sempre que o funil entra — a IA recebe os problemas já achados e gasta raciocínio em estratégia |
| `metrics` | intents de métrica/gargalo |
| `mcpCatalog` (só nomes/descrições das tools permitidas) | modo ANALYZE/ACT |

Isso resolve literalmente o §56: clicar no node "WhatsApp" e perguntar "como melhoramos
isso?" já manda aquele node e suas conexões próximas.

**ProjectMemory** (§52) é registro estruturado — não é log de chat. Campos: `product`,
`icp`, `offer`, `pricing`, `goals`, `constraints`, `decisions[]`, `importantFacts[]`.
O agente atualiza via tool `remember_fact`, e isso persiste entre sessões.

### 6.4 Modos (§54)
| Modo | Tools disponíveis | Efeito |
|---|---|---|
| **ASK** | nenhuma | só responde |
| **ANALYZE** | apenas `READ` | consulta funil, métricas, MCP read |
| **ACT** | `READ` + `WRITE` (como proposta) | produz `ChangeSet` para preview |

`ACT` **não** significa escrita direta. Tools de escrita do canvas retornam operações que
alimentam o preview; o commit é clique humano. Mesmo no futuro "operador" (§61), a fronteira
permanece: *reasoning / tools / permissions / execution / audit* são módulos separados.

### 6.5 Tool Registry (§46)
Tool = `{ name, description, category: READ|WRITE|DESTRUCTIVE, inputSchema: ZodSchema, handler }`.
JSON Schema derivado do Zod (`zod-to-json-schema`) — um único ponto de verdade. Toda entrada
é revalidada no handler; nunca confiamos no modelo para respeitar o schema.

### 6.6 ChangeSet — o contrato que protege o trabalho do usuário (§33, §47)
```ts
type Change =
  | { op: 'add_node';    node: FunnelNode }
  | { op: 'update_node'; id: string; patch: Partial<FunnelNodeData> }
  | { op: 'delete_node'; id: string }
  | { op: 'add_edge';    edge: FunnelEdge }
  | { op: 'update_edge'; id: string; patch: Partial<FunnelEdgeData> }
  | { op: 'delete_edge'; id: string }
  | { op: 'add_group';   group: FunnelGroup }
  | { op: 'update_group'; id: string; patch: Partial<FunnelGroupData> }

interface ChangeSet {
  id: string
  rationale: string
  changes: Change[]
  impact: { added: number; updated: number; deleted: number }
}
```
Pipeline de aplicação:
```
resposta do modelo → Zod.parse → validateAgainstGraph (ids existem? cria ciclo inválido?)
                   → autoLayout dos nodes novos → preview (fantasma no canvas)
                   → [APLICAR] transação única no store (um undo) | [IGNORAR] descarta
```
`delete_node`/`delete_edge` vindos da IA são sempre destacados em vermelho no preview e
nunca vêm pré-selecionados. Não destruímos trabalho existente sem ato explícito.

### 6.7 Agent Activity (§60)
O stream SSE emite `AgentEvent`s tipados: `text_delta`, `tool_start`, `tool_result`,
`change_set`, `error`, `done`. A UI mostra **ações**, não raciocínio:
`✓ Leu estrutura do funil · ✓ Consultou métricas · ✓ Encontrou 3 gargalos`.
Thinking interno do modelo não vai para a tela.

### 6.8 Fontes (§50)
Todo dado externo carrega `source: { kind: 'mcp'|'db'|'canvas'|'inference', label }`.
A UI renderiza o selo ("Segundo RD Station" / "Análise da IA"). O system prompt instrui
explicitamente a não fundir observação com inferência — e a UI torna a mistura visível.

---

## 7. MCP (§43–45, §51, §59)

`MCPManager` server-side, conexões por workspace, habilitação **por projeto** (§51 — evita
o agente cruzar contexto entre GD Frete e GD Frotas).

Toda chamada passa por um gate:
```
tool call → servidor habilitado neste projeto? → tool na allowlist?
          → categoria? READ: executa · WRITE: confirma se configurado
                       DESTRUCTIVE: SEMPRE confirma (§45)
          → timeout 30s → log em mcp_tool_calls (quem, quando, args, resultado, latência)
```
Confirmação destrutiva é round-trip real: o stream pausa com `tool_confirmation_required`,
a UI mostra `[CONFIRMAR] [CANCELAR]`, e só a resposta humana libera a execução.

Auth: `none` | `bearer` | `oauth2`. Tokens criptografados, server-side, nunca retornados ao
cliente — nem mascarados (§58, §59).

---

## 8. Segurança

- **RLS em todas as tabelas**, testada com suíte dedicada que tenta acessar dado de outro
  workspace e espera zero linhas. Detalhes em `DATABASE.md`.
- **Segredos**: `ANTHROPIC_API_KEY` só em env de servidor. BYOK e tokens MCP em
  AES-256-GCM com chave em `ENCRYPTION_KEY` (rotacionável via `key_version`); colunas de
  cifra jamais entram em `SELECT` exposto ao cliente — acesso só por função `SECURITY DEFINER`.
- **Share links** (§20): token de 32 bytes, guardado como hash. Senha opcional em Argon2id.
  Rota `/share/[token]` é servida por client anônimo com policy própria e read-only real.
- **Rate limit + quota** por workspace nas rotas de IA, com custo estimado registrado.
- **Prompt injection**: conteúdo vindo de MCP entra no contexto marcado como dado externo
  não confiável; nenhuma tool destrutiva executa sem confirmação humana, então texto
  malicioso não consegue escalar sozinho.

---

## 9. Árvore de diretórios

```
gd-funnel-builder/
├─ ARCHITECTURE.md · DATABASE.md · FUNNEL_SCHEMA.md · ROADMAP.md · README.md
├─ .env.example
├─ supabase/
│  ├─ migrations/           0001_init.sql, 0002_rls.sql, ...
│  └─ seed/                 templates oficiais (inclui GD Frete)
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login, signup, callback
│  │  ├─ (app)/dashboard, projects/[id], funnels/[id], settings/{ai,integrations,usage}
│  │  ├─ share/[token]/
│  │  └─ api/
│  │     ├─ agent/chat/route.ts          (SSE)
│  │     ├─ agent/tools/confirm/route.ts
│  │     ├─ ai/{generate,analyze}/route.ts
│  │     ├─ funnels/[id]/{save,export}/route.ts
│  │     └─ mcp/[serverId]/test/route.ts
│  ├─ features/
│  │  ├─ canvas/    components/{nodes,edges,groups,toolbar,panels} · hooks · store
│  │  ├─ dashboard/ · agent/ · metrics/ · templates/ · share/ · settings/
│  ├─ components/ui/        shadcn
│  ├─ domain/
│  │  ├─ funnel/  schema.ts · taxonomy.ts · graph.ts · layout.ts
│  │  ├─ lint/    rules/*.ts · run.ts
│  │  ├─ math/    simulate.ts · propagate.ts
│  │  └─ changeset/ apply.ts · validate.ts · diff.ts
│  ├─ services/ai/
│  │  ├─ claude-provider.ts · agent-service.ts · agent-context.ts
│  │  ├─ tool-registry.ts · mcp-manager.ts
│  │  ├─ prompts/ · tools/ · memory/
│  ├─ data/       repositories/*.ts · supabase/{client,server,admin}.ts
│  └─ lib/        crypto.ts · sse.ts · errors.ts · analytics.ts
└─ tests/  unit/ (domain) · integration/ (rls, api) · e2e/ (playwright)
```

Arquivo acima de ~300 linhas é sinal de responsabilidade mal dividida (§36).

---

## 10. Ambiguidades identificadas no PRD (§37.2)

Levantadas agora porque mudam o schema. **Assumi um default em cada uma** e sigo com ele —
basta apontar as que quiser diferentes.

| # | Ambiguidade | Default assumido |
|---|---|---|
| 1 | `projects` × `funnels`: um projeto tem N funis? | **Sim.** Workspace → N projects → N funnels. "GD Frete" é projeto; "Aquisição Instagram" é funil dentro dele. É o que permite MCP por projeto (§51) e ProjectMemory (§52). |
| 2 | "Responsável" (§4, §10) é usuário do sistema ou texto? | **Texto livre** no MVP (`owner_label`), com campo opcional `owner_user_id` já previsto. Times reais não têm todo mundo cadastrado no dia 1. |
| 3 | Métricas (§16) são planejadas ou reais? | **Ambas, separadas.** `planned` (o que o usuário/Funnel Math projeta) e `actual` (o que virá de integração). A comparação entre as duas é exatamente o §49. Misturar os dois campos mataria essa feature. |
| 4 | Funnel Math (§17) é global ou por caminho? | **Por caminho.** Taxas moram nas *edges*; simulação propaga do node de entrada. Funil com ramificação não tem taxa única. |
| 5 | Colaboração simultânea | **Fora do MVP.** Single-editor com optimistic locking por `version`; conflito avisa em vez de sobrescrever. Realtime multi-cursor é pós-MVP. |
| 6 | Comentários (§26) são no canvas ou no funil? | **Ancorados**: em node, edge ou ponto livre do canvas. Fase 4. |
| 7 | Templates são globais ou do workspace? | **Ambos**: `templates.workspace_id NULL` = oficial do sistema (GD Frete entra aqui); não-nulo = template do cliente. |
| 8 | BYOK no MVP? | **Arquitetura pronta, feature desligada.** MVP usa system key com quota por workspace. Ligar BYOK é preencher uma tabela que já existe. |
| 9 | "Compartilhar → pode editar" exige conta? | **Sim.** Edição anônima quebra auditoria e RLS. Link de edição vira convite ao workspace. |
| 10 | Idioma / moeda | **pt-BR e BRL** como default, mas toda string de UI passa por dicionário desde o início — i18n depois não vira refactor. |
| 11 | Export PNG/PDF: cliente ou servidor? | **Cliente** (html-to-image + jsPDF). Servidor com headless browser é custo de infra que o MVP não precisa. |
| 12 | Versionamento (§27) é automático ou manual? | **Híbrido**: snapshot automático a cada N mudanças significativas ou 10min, + snapshot manual nomeado, + snapshot obrigatório **antes de todo `apply` de ChangeSet da IA**. Aplicar sugestão de IA sempre tem volta. |

---

## 11. Riscos e como estamos cobrindo

| Risco | Mitigação |
|---|---|
| Canvas degradar acima de 200 nodes | Store fora do React, memo por `data.rev`, render só do visível, teste de performance no CI antes de features novas. |
| IA devolver JSON inválido ou alucinar ids | Zod + validação contra o grafo real + retry com erro estruturado; falha vira mensagem honesta, nunca canvas corrompido. |
| Custo de token explodir | Context Engine com orçamento, lint determinístico antes da IA, prompt caching do system prompt, quota por workspace, página de Usage (§57). |
| RLS mal escrita = vazamento entre clientes | Suíte de testes de RLS que roda no CI como cidadão de primeira classe. Policy nova sem teste não entra. |
| MCP como superfície de execução | Allowlist, categorias, confirmação obrigatória em DESTRUCTIVE, timeout, auditoria completa. |
| Escopo (o PRD tem 62 seções) | ROADMAP.md corta em 5 fases com critério de aceite. Fase 1 sozinha já é produto usável. |
