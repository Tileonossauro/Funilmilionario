# ROADMAP.md — GD Funnel Builder

Cinco fases, cada uma com critério de aceite verificável. A regra de corte de escopo é o
§38: *"isso ajuda o usuário a compreender, construir ou melhorar o funil?"*

Cada fase termina em algo **demonstrável para um cliente real**. Nenhuma fase depende de
outra estar "perfeita" — depende de estar funcionando.

---

## Fase 0 — Fundação (pré-requisito, não é feature)

| # | Entrega |
|---|---|
| 0.1 | Next.js 15 + TS strict + Tailwind v4 + shadcn; ESLint com `boundaries` impondo as camadas |
| 0.2 | Projeto Supabase, migrations `0001`–`0011`, RLS completa |
| 0.3 | `domain/funnel/schema.ts` (Zod) + `taxonomy.ts` — o schema antes de qualquer tela |
| 0.4 | Design tokens: dark/light/system, tipografia, espaçamento, elevação (§23, §24) |
| 0.5 | CI: typecheck, lint, Vitest, testes de RLS |
| 0.6 | `.env.example` + README |

**Aceite:** `npm run verify` verde; teste de RLS prova que usuário A não lê funil de B.

---

## Fase 1 — MVP: o editor funciona (§34 Fase 1)

O objetivo desta fase é uma frase: **dá para construir e salvar um funil de verdade.**

| # | Entrega | Detalhe |
|---|---|---|
| 1.1 | Auth | Supabase Auth (email + magic link), criação automática de workspace pessoal |
| 1.2 | Dashboard | grid de funis com nome, última edição, nº de etapas, status, responsável (§4); empty state de verdade, não placeholder |
| 1.3 | Projetos | CRUD, arquivar |
| 1.4 | Canvas | XYFlow, pan/zoom/fit, minimap (§30), grid |
| 1.5 | Sidebar de componentes | biblioteca por categoria, busca, drag-to-canvas |
| 1.6 | Nodes | renderer genérico dirigido pela taxonomia — 60+ tipos sem 60 componentes |
| 1.7 | Edges | reta/curva/step, seta, rótulo editável inline (§11) |
| 1.8 | Interações (§8) | mover, duplicar, deletar, multi-seleção, copy/paste, conectar/desconectar, double-click edita |
| 1.9 | Atalhos | Delete, Ctrl+C/V/Z/Shift+Z, Ctrl+D, Ctrl+A, Space=pan |
| 1.10 | Undo/redo | zundo, transacional, 100 passos |
| 1.11 | Painel de propriedades | todos os campos do §10 |
| 1.12 | Autosave | debounce + diff + RPC + indicador "Salvando…/✓ Salvo" (§25) |
| 1.13 | Export/Import JSON | `FunnelGraph` com `schemaVersion` (§19) |
| 1.14 | Dark mode | light/dark/system (§24) |

**Aceite:**
- Construir um funil de 30 nodes com ramificação, fechar o browser, reabrir: idêntico.
- Exportar JSON, apagar o funil, importar: idêntico.
- Undo desfaz um paste de 10 nodes em um passo.
- 60fps de drag com 200 nodes (medido, não estimado).

---

## Fase 2 — Estrutura e apresentação (§34 Fase 2)

| # | Entrega |
|---|---|
| 2.1 | Grupos: criar, mover, redimensionar, colapsar, colorir (§12) |
| 2.2 | Templates: galeria por categoria, preview, instanciar (§21) |
| 2.3 | **Template GD Frete** completo com as duas ramificações (§22) |
| 2.4 | Modo apresentação: esconde toda a UI, fullscreen, navegação por estágio (§18) |
| 2.5 | Export PNG e PDF (client-side) (§19) |
| 2.6 | Versionamento: lista, visualizar, restaurar (§27) |
| 2.7 | Command palette Ctrl+K (§28) |
| 2.8 | Busca Ctrl+F com centralização no node (§29) |
| 2.9 | Auto-layout (dagre) — "organizar funil" em um clique |
| 2.10 | **Lint determinístico** (§15) — painel de problemas, clique navega até o node |

> 2.10 está aqui de propósito, **antes** da IA. É a maior parte do valor do §15, custa zero
> token, responde em milissegundos e funciona offline. Entregar isso antes também prova o
> §15 na prática: só sobra para a IA o que é realmente interpretação estratégica.

**Aceite:** abrir o template GD Frete, apresentar em tela cheia para um cliente, exportar
PDF, e o painel de lint apontar corretamente um dead end criado de propósito.

---

## Fase 3 — Claude como agente nativo (§34 Fase 3 + §39–§48, §52–§57, §60)

A fase que define o produto.

### 3A — Fundação do agente
| # | Entrega |
|---|---|
| 3.1 | `AIProvider` + `ClaudeProvider` (§3, §40) |
| 3.2 | `AgentService`, `/api/agent/chat` com streaming SSE |
| 3.3 | `tool-registry.ts` com as tools internas de leitura do §46 |
| 3.4 | `agent-context.ts` — `buildAgentContext()` com slices e orçamento (§42, §53) |
| 3.5 | `ChangeSet` + validação + preview + apply/ignore (§33) |
| 3.6 | Painel lateral ✨ CLAUDE, context-aware desde a primeira mensagem (§41, §56) |
| 3.7 | Agent Activity — ações visíveis, raciocínio interno não (§60) |
| 3.8 | Modos ASK / ANALYZE / ACT com indicação clara (§54) |

### 3B — Capacidades
| # | Entrega |
|---|---|
| 3.9 | Criar funil com IA: modal do §6 → `ChangeSet` → preview → aplicar |
| 3.10 | Analisar funil: cards de sugestão com [Aplicar] [Ignorar] (§14) |
| 3.11 | Tools de escrita (`create_node`, `update_node`, `create_edge`…) sempre via ChangeSet |
| 3.12 | Comandos `/analyze /improve /metrics /bottlenecks /create /compare` (§55) |
| 3.13 | `ProjectMemory` — leitura e escrita pelo agente (§52) |
| 3.14 | Snapshot automático antes de todo apply de IA |
| 3.15 | Settings → AI → Usage: requests, tokens, custo, tool calls, erros, latência (§57) |
| 3.16 | Quota e rate limit por workspace |

**Aceite (o teste real do produto):**
1. Descrever o GD Frete no modal → sair um funil editável coerente, com grupos e ramificação.
2. Apagar de propósito o fluxo de quem não responde → perguntar "está faltando algo?" →
   o agente aponta isso e propõe as etapas.
3. Selecionar 3 nodes, perguntar "o que você acha disso?" → a resposta é sobre **aqueles**
   nodes, sem o usuário explicar nada (§42).
4. [VER ALTERAÇÕES] mostra preview; [IGNORAR] não deixa resíduo; [APLICAR] é um único undo.

---

## Fase 4 — Métricas, simulação e colaboração (§34 Fase 4)

| # | Entrega |
|---|---|
| 4.1 | Métricas por node: planned/actual/target, exibição no card (§16) |
| 4.2 | Taxas nas edges com validação de soma |
| 4.3 | **Funnel Math** — modo 📊 SIMULAR com overlay no canvas (§17) |
| 4.4 | Agente lê métricas e compara planejado × real (§49) |
| 4.5 | Compartilhamento `/share/{token}`: view/comment/edit, senha, expiração (§20) |
| 4.6 | Comentários ancorados em node/edge/canvas (§26) |
| 4.7 | Selos de fonte na UI: "Segundo RD Station" / "Análise da IA" (§50) |

**Aceite:** tráfego 10.000 → CTR 2% → LP 20% → ativação 40% → trial→paid 30% → ticket
R$29,90 produz clientes e MRR corretos sobre o canvas, conferidos contra cálculo manual em
teste unitário. Link compartilhado com senha abre read-only sem sessão.

---

## Fase 5 — MCP e o caminho para operador (§43–§45, §51, §58, §59, §61)

| # | Entrega |
|---|---|
| 5.1 | `mcp-manager.ts` — múltiplos servidores remotos, discovery de tools |
| 5.2 | Settings → Integrations → MCP Servers: conectar, testar, status (§43) |
| 5.3 | Auth: none / bearer / oauth2, credenciais cifradas server-side (§59) |
| 5.4 | Allowlist + classificação READ/WRITE/DESTRUCTIVE + confirmação (§45) |
| 5.5 | Habilitação de MCP **por projeto** (§51) |
| 5.6 | Auditoria completa de tool calls, visível em Usage |
| 5.7 | BYOK: chave do cliente, cifrada, nunca retornada ao frontend (§58) |
| 5.8 | Tools de MCP entrando no Context Engine por relevância de intent |

**Aceite:** conectar um MCP de leitura, perguntar algo que exija dado externo, a resposta
separar observação de inferência com fonte; uma tool destrutiva **parar** e exigir
[CONFIRMAR]; o log registrar quem confirmou.

**Explicitamente fora** (§35): Meta Ads API, Google Ads API, RD Station API, WhatsApp API,
Hotmart, Kiwify. Arquitetura pronta; integração direta não entra.

---

## Sequenciamento e dependências

```
Fase 0 ──▶ Fase 1 ──┬──▶ Fase 2 ──┬──▶ Fase 3 ──▶ Fase 5
                    │             │
                    └─────────────┴──▶ Fase 4
```
Fase 4 depende do schema de métricas (Fase 0) e do canvas (Fase 1), não da IA. Se a Fase 3
atrasar, Fase 4 segue em paralelo.

---

## Definition of Done (toda entrega, sem exceção)

- [ ] TypeScript strict, zero `any` em `domain/`
- [ ] Entrada validada por Zod na fronteira
- [ ] Loading state, empty state e error state — os três, não só o caminho feliz (§36)
- [ ] Teste unitário se toca `domain/`; teste de RLS se toca policy
- [ ] Acessível por teclado; foco visível
- [ ] Funciona em light e dark
- [ ] Nenhum segredo fora do servidor
- [ ] Nenhum arquivo acima de ~300 linhas sem justificativa

---

## Como saberemos que o produto é bom

Métricas de produto, não de engenharia:

| Sinal | Alvo |
|---|---|
| Tempo até o primeiro funil salvo | < 5 min a partir do signup |
| Funis criados com IA que são **editados depois** | > 70% (se ninguém edita, a IA não acertou o suficiente para valer a pena continuar) |
| Sugestões de IA aplicadas ÷ sugeridas | > 40% |
| Funis apresentados em modo apresentação | sinal de que virou ferramenta de reunião, não brinquedo |
| p95 de interação no canvas | < 16ms com 200 nodes |

A pergunta do §38 se aplica a este roadmap também: cada linha acima ajuda alguém a
compreender, construir ou melhorar um funil. O que não passou nesse teste ficou de fora.
