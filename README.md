# GD Funnel Builder

Monte a jornada de aquisição visualmente, lance os números de cada etapa e acompanhe
com tarefas automáticas. Em vez de digitar os números, jogue o print — a IA lê pra você.

---

## O que já funciona

- **Canvas drag & drop** com 26 tipos de etapa (Instagram, Reels, Landing Page, WhatsApp,
  App, Checkout...), conexões, minimap, zoom e dark mode.
- **Números por etapa**: lançamento com período, histórico completo e métricas derivadas
  (CTR, conversão, CPL, CAC, ticket) calculadas — nunca digitadas.
- **Tarefas automáticas**: adicionou Landing Page, nasce "Conferir dados da LP" em D+3.
  Meta Ads gera "Revisar investimento e CPL" em D+1. Cada tipo tem sua regra.
- **Leitura de print**: arrasta o screenshot do Instagram Insights / Gerenciador de
  Anúncios / Analytics no painel da etapa e os números chegam preenchidos, com selo de
  confiança por campo, para você conferir antes de salvar.

## Rodando

```bash
npm install
cp .env.example .env.local     # preencha as variáveis
npm run dev
```

### Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode as migrations de `supabase/migrations/` na ordem (SQL Editor ou `supabase db push`).
3. Copie URL e anon key para `.env.local`.

As migrations criam as 6 tabelas, o bucket privado de prints, RLS em tudo e o trigger que
cria o perfil no cadastro.

### Claude (opcional)

`ANTHROPIC_API_KEY` no `.env.local` liga a leitura de print. **Sem ela o app funciona
inteiro** — só o upload de screenshot fica indisponível, com mensagem clara na tela.

A chave só é lida no servidor (`src/services/ai/`), nunca chega ao navegador.

## Comandos

```bash
npm run dev         # desenvolvimento
npm run build       # build de produção
npm run typecheck   # tsc --noEmit
npm run test        # vitest
npm run verify      # typecheck + test
```

## Estrutura

```
src/
├─ domain/          puro: sem React, sem Supabase, 100% testável
│  ├─ funnel/       taxonomia das etapas, schema Zod
│  ├─ metrics/      chaves e cálculo das derivadas
│  ├─ tasks/        regras de tarefa automática
│  └─ extraction/   contrato da leitura de print
├─ features/        canvas, dashboard, tarefas, shell
├─ services/ai/     provider Claude — server-only
├─ lib/supabase/    clientes browser/server e tipos do banco
└─ app/             rotas, server actions, /api/extract

supabase/migrations/  schema, RLS, storage
docs/visao-completa/  a visão maior (agente, MCP, templates) — referência futura
```

Regra de camadas: `domain/` não importa React nem Supabase. É o que permite testar
o cálculo de métricas e as regras de tarefa sem browser e sem banco.

## Decisões que valem saber

**Métricas são um log, não uma coluna.** Cada lançamento vira uma linha em
`metric_entries` com período próprio. O card da etapa mostra o mais recente, mas o
histórico fica — sem isso não dá para ver que a LP caiu de 18% para 11%.

**Derivadas nunca são digitadas.** CTR, CPL, CAC e ticket saem de cliques, investimento e
vendas. Deixar alguém digitar um CTR que discorda dos cliques é fabricar inconsistência.

**A IA não salva sozinha.** O print é lido, os campos são preenchidos, e você confirma.
Número lido errado que entra direto no histórico é pior que número nenhum — você decidiria
em cima de dado falso sem saber. O que a IA economiza é a digitação, não a conferência.

**Campo não encontrado vem vazio, não zero.** Zero é um valor real ("não tivemos vendas").
Usar zero para dizer "não achei" faz o histórico mentir.

## Próximos passos

Ver `PLAN.md`. A visão completa (agente Claude conversacional, MCP, templates,
compartilhamento, simulação) está em `docs/visao-completa/` — planejada, fora do escopo atual.
