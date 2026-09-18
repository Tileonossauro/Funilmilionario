# PLAN.md — o que estamos construindo (versão enxuta)

Escopo redefinido em 18/09. A visão completa (agente Claude, MCP, templates,
compartilhamento, simulação) está preservada em `docs/visao-completa/` — é para onde
vamos, não é o que construímos agora.

---

## O MVP em quatro frases

1. Eu monto a jornada visualmente arrastando etapas tipadas: Instagram → Reels →
   Landing Page → WhatsApp → App.
2. Eu lanço os números de cada etapa na mão.
3. Quando eu adiciono uma etapa, o sistema cria a tarefa de acompanhamento sozinho
   ("LP criada → conferir dados em 3 dias").
4. Em vez de digitar número, eu jogo o print do Instagram/Meta lá dentro e a IA lê os
   números pra mim. Eu confiro e aceito.

Nada além disso entra agora.

---

## O que foi cortado (e por quê)

| Cortado | Motivo |
|---|---|
| Agente Claude conversacional, MCP, tool registry | O MVP não precisa conversar. Precisa **ler print**. É 5% do trabalho e entrega 80% do valor de IA aqui. |
| Geração de funil por IA, ChangeSet, preview | Você quer montar o funil você mesmo. Gerar sozinho é feature de vendedor, não sua dor. |
| Workspaces, projetos, times, permissões | Uma conta, seus funis. Hierarquia entra quando existir segunda pessoa usando. |
| Templates, apresentação, export PNG/PDF, compartilhamento, comentários, versionamento | Nenhum desses te ajuda a *construir* ou *acompanhar*. Ficam para depois. |
| Funnel Math / simulação | Simular é hipótese. Você quer o número real. Os dados reais vêm primeiro. |
| Lint determinístico (15 regras) | Fica 1 regra: etapa sem saída. O resto é ruído enquanto o funil é pequeno. |

Sobrou o que responde a: **dá pra montar, dá pra acompanhar, dá pra lançar sem digitar.**

---

## Sobre o print — uma correção que eu mesmo preciso fazer

Em `docs/visao-completa/ARCHITECTURE.md` eu escrevi "não envie screenshots para a IA".
Aquilo vale para a **estrutura do funil** — o canvas já é JSON, mandar foto dele seria
desperdício. Não vale para o que você pediu.

Ler número de print do Instagram Insights, do Gerenciador de Anúncios ou do Analytics é
exatamente o uso certo de visão: o dado **só existe** como pixel na sua tela. Não tem JSON
para pedir. São coisas diferentes e as duas estão certas.

---

## Stack (a mesma, sem a parte cara)

Next.js 15 (App Router) · TypeScript strict · Tailwind · @xyflow/react ·
Zustand · Zod · Supabase (Postgres + Auth + Storage) · Anthropic SDK (só visão, server-side).

Fora: TanStack Query, shadcn completo, zundo, MCP, framer-motion. Entram quando doerem.

---

## Modelo de dados — 6 tabelas

```
profiles
  └── funnels
        ├── funnel_nodes ──┬── metric_entries   (histórico de lançamentos)
        ├── funnel_edges   └── tasks            (acompanhamento)
        └──                    extractions      (print → números, antes de confirmar)
```

O detalhe que importa: **`metric_entries` é um log, não uma coluna.** Cada lançamento é uma
linha com período (`de`/`até`), valores e origem (`manual` ou `screenshot`). O node mostra o
lançamento mais recente, mas o histórico fica — é o que permite ver "a LP caiu de 18% pra
11% em duas semanas". Se o número morasse numa coluna do node, cada atualização apagaria a
anterior e não haveria acompanhamento nenhum, só um retrato do presente.

DDL completo em `supabase/migrations/`.

---

## Etapas (tipos de node)

Enxugadas de 60+ para ~24, em 6 famílias:

```
tráfego      instagram · meta_ads · google_ads · tiktok · youtube · seo · indicacao
conteúdo     reels · story · post · video · vsl
página       landing_page · pagina_vendas · checkout · formulario
contato      whatsapp · dm · email · ligacao
produto      cadastro · trial · ativacao · assinatura · app
outros       condicao · nota
```

Cada tipo declara ícone, cor, métricas que fazem sentido nele, e a regra de tarefa que
dispara quando é criado. Adicionar tipo novo = uma entrada no objeto, nada mais.

---

## Métricas

Chaves únicas em todo o sistema: `investimento · impressoes · cliques · visitantes ·
leads · conversas · ativacoes · vendas · receita`.

Derivadas (calculadas, nunca digitadas): `ctr · conversao · cpl · cac · ticket`.

Digitar algo que o sistema sabe calcular é convite a número inconsistente.

---

## Tarefas

Dois caminhos de criação:

- **Automático por regra**: cada tipo de node tem `taskRule?: { titulo, prazoDias }`.
  Criou landing page → "Conferir dados da Landing Page" com prazo D+3. Criou campanha de
  Meta Ads → "Revisar investimento e CPL" em D+1.
- **Manual**: eu crio a tarefa em qualquer etapa.

Estado: `aberta` · `feita`. Sem prioridade, sem responsável, sem subtarefa. A tela de
tarefas ordena por vencimento e destaca atrasada.

---

## Print → números

```
arrasto o print no painel da etapa
   → upload pro Supabase Storage (privado)
   → POST /api/extract  (server-side, chave da Anthropic nunca sai do servidor)
   → Claude lê a imagem e devolve JSON validado por Zod
   → tela de conferência: campo a campo, com o valor que ele leu
   → eu ajusto o que estiver errado e confirmo
   → vira uma linha em metric_entries (source: 'screenshot')
```

**A confirmação é obrigatória.** Número lido errado que entra sozinho no histórico é pior
que número nenhum — você tomaria decisão em cima de dado falso sem saber. O trabalho que a
IA economiza é a digitação, não a conferência.

Se a extração falhar ou vier com baixa confiança, o campo vem vazio e marcado, não chutado.

---

## Roadmap — 3 entregas

### Entrega 1 — monta e salva
Auth, lista de funis, canvas com drag & drop, 24 tipos de etapa, conexões com rótulo,
mover/duplicar/deletar/desfazer, painel de propriedades, autosave, dark mode.

*Pronto quando:* eu monto a jornada Instagram → Reels → LP → WhatsApp → App, fecho o
navegador, abro de novo e está tudo lá.

### Entrega 2 — acompanha
Lançamento manual de métricas com período, histórico por etapa, derivadas calculadas,
tarefas automáticas por regra, tarefas manuais, tela de tarefas com atrasadas em destaque.

*Pronto quando:* eu adiciono uma LP e a tarefa de conferir em 3 dias aparece sozinha; eu
lanço os números de duas semanas e vejo a variação.

### Entrega 3 — para de digitar
Upload de print, extração via Claude, tela de conferência, gravação no histórico.

*Pronto quando:* eu jogo um print do Instagram Insights e os números chegam certos na
etapa, com eu só conferindo.

Depois disso a gente reavalia com o produto na mão — não antes.
