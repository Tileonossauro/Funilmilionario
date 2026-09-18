# GD Funnel Builder

Monte a jornada de aquisição visualmente, lance os números de cada etapa e acompanhe
com tarefas automáticas. Em vez de digitar os números, jogue o print — a IA lê pra você.

---

## O que já funciona

- **Canvas drag & drop** com 26 tipos de etapa (Instagram, Reels, Landing Page, WhatsApp,
  App, Checkout...), conexões, minimap, zoom e dark mode. Cada família tem cor e silhueta
  próprias — o funil se lê de longe, pela forma, sem ler uma palavra.
- **Taxa de passagem nas conexões**: a LP gerou 228 leads mas só 180 viraram conversa no
  WhatsApp? A linha entre as duas mostra 79%, em vermelho. É a queda que não aparece
  olhando nenhuma das duas etapas isoladamente.
- **Números por etapa**: lançamento com período, histórico completo e métricas derivadas
  (CTR, conversão, CPL, CAC, ticket) calculadas — nunca digitadas.
- **Tarefas automáticas**: adicionou Landing Page, nasce "Conferir dados da LP" em D+3.
  Meta Ads gera "Revisar investimento e CPL" em D+1. Cada tipo tem sua regra.
- **Projeção (Simular)**: informe tráfego e investimento e o canvas mostra quantas pessoas
  chegam em cada etapa, quanta receita sai no fim, CAC, ROAS e lucro. As taxas **começam nos
  seus números reais** — se a sua LP converte 18,4% de verdade, a projeção parte daí. Onde o
  sistema precisou adivinhar, ele marca com traço pontilhado e avisa.
- **Etapa de Oferta**: separada da página de vendas. A página é onde a pessoa passa; a oferta
  é o que ela compra e por quanto. Order bump e upsell no mesmo funil, cada um com seu preço.
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

O projeto **`gd-funnel-builder`** (ref `fcspyecxcukhwgzcyqog`, região sa-east-1) já está
criado com todas as migrations aplicadas. Basta copiar a anon key do painel para
`.env.local`:

https://supabase.com/dashboard/project/fcspyecxcukhwgzcyqog/settings/api

Para subir do zero em outro lugar, rode `supabase/migrations/` na ordem — criam as 6
tabelas, o bucket privado de prints, RLS em tudo e o trigger de perfil no cadastro.

**Antes do primeiro login**, confira em Authentication → Providers → Email se a
confirmação de e-mail está do jeito que você quer. Ligada, o cadastro só entra depois de
clicar no link do e-mail.

#### Testar a RLS

`supabase/tests/rls.sql` roda no SQL Editor. Ele simula dois usuários e tenta invadir o
funil do outro de quatro formas. Passa em silêncio; falha nomeando o vazamento. **Rode a
cada policy nova** — foi ele que pegou a falha corrigida em `0004`.

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

**Cada etapa sabe sua entrada e sua saída.** `landing_page` entra por visitantes e sai por
leads; `whatsapp` entra por conversas e sai por ativações. É esse par que permite calcular
a conversão da etapa e a taxa de passagem entre etapas sem heurística — o mesmo número
significaria coisas diferentes em cada etapa se fosse genérico.

**Projeção e realidade nunca aparecem juntas no mesmo card.** Ligou Simular, o card mostra o
projetado; desligou, mostra o real. Número hipotético ao lado de número medido é como alguém
apresenta projeção achando que é resultado.

**Taxa em branco na projeção significa "usa meu histórico", não zero.** O placeholder mostra
a taxa real da etapa. Campo vazio virando zero silenciosamente derruba a projeção inteira sem
ninguém entender por quê.

**RLS checa o dono do funil, não só o dono da linha.** Policy que valida apenas
`owner_id = auth.uid()` na própria linha deixa qualquer um inserir etapas no funil alheio,
bastando declarar a linha como sua. As tabelas filhas exigem posse do funil, e as conexões
exigem que as duas pontas morem nele.

## Colocar no ar

Ver [DEPLOY.md](./DEPLOY.md). Resumo: o app precisa de Node rodando no servidor
(hospedagem compartilhada de PHP não serve), e o domínio pode continuar onde está
— basta apontar o DNS.

## Próximos passos

Ver `PLAN.md`. A visão completa (agente Claude conversacional, MCP, templates,
compartilhamento, simulação) está em `docs/visao-completa/` — planejada, fora do escopo atual.
