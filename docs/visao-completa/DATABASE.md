# DATABASE.md — GD Funnel Builder

PostgreSQL 15 via Supabase. UUID em todo lugar (`gen_random_uuid()`), `timestamptz`,
RLS habilitada em **todas** as tabelas sem exceção.

---

## 1. Diagrama de relacionamento

```
auth.users
    │
    └── profiles (1:1)
            │
            └── workspace_members ──── workspaces
                                            │
                    ┌───────────────────────┼──────────────────────┐
                    │                       │                      │
                projects                mcp_servers          workspace_ai_settings
                    │                       │
      ┌─────────────┼──────────────┐   project_mcp_servers
      │             │              │
  funnels    project_memory   ai_generations
      │
      ├── funnel_nodes ──┐
      ├── funnel_edges   ├── comments
      ├── funnel_groups ─┘
      ├── funnel_versions
      └── funnel_shares

templates (workspace_id NULL = oficial do sistema)
agent_sessions → agent_messages → agent_tool_calls
```

---

## 2. Decisão estrutural: tabelas normalizadas + snapshot

Duas opções reais existiam:

**(A)** grafo inteiro num `jsonb` na tabela `funnels`. Save simples, mas nenhuma query
(`quantos funis usam WhatsApp?`), e um save de 500 nodes reescreve a linha toda.

**(B)** `funnel_nodes` / `funnel_edges` / `funnel_groups` normalizados. Consultável,
diffável, RLS por linha — mas exige uma escrita disciplinada.

**Escolha: (B), com uma única porta de escrita.** O cliente nunca faz INSERT/UPDATE direto
em nodes; chama a RPC `save_funnel_graph(funnel_id, changes jsonb, base_version int)`, que
aplica o diff numa transação, incrementa `funnels.version` e devolve a nova versão. Isso dá:
autosave barato (trafega só o diff), concorrência otimista, e um ponto único para auditar.

`funnel_versions` guarda o **snapshot completo em jsonb** — é histórico (§27), não estado
operacional. Ali a desnormalização é a escolha certa: snapshot precisa ser imutável e
restaurável em um passo.

---

## 3. Tabelas

### 3.1 Identidade e tenancy

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  owner_id    uuid not null references profiles(id),
  plan        text not null default 'free',
  created_at  timestamptz not null default now()
);

create type workspace_role as enum ('owner','admin','editor','viewer');

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  role         workspace_role not null default 'editor',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on workspace_members (user_id);
```

### 3.2 Projetos e funis

```sql
create table projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  color        text,                       -- cor do card no dashboard
  archived_at  timestamptz,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on projects (workspace_id) where archived_at is null;

create type funnel_status as enum ('draft','active','paused','archived');

create table funnels (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade, -- denormalizado: RLS em 1 hop
  name         text not null,
  description  text,
  status       funnel_status not null default 'draft',
  owner_label  text,                       -- §10 "responsável" como texto (ambiguidade #2)
  owner_user_id uuid references profiles(id),
  viewport     jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  simulation   jsonb,                      -- inputs do Funnel Math (§17)
  version      integer not null default 1, -- optimistic locking
  node_count   integer not null default 0, -- card do dashboard sem count()
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on funnels (project_id);
create index on funnels (workspace_id, updated_at desc);
```

`workspace_id` duplicado em `funnels` é deliberado: sem ele, toda policy de node faria
`node → funnel → project → workspace`. Três joins por linha, em toda leitura de canvas.

### 3.3 Grafo

```sql
create table funnel_nodes (
  id         uuid primary key default gen_random_uuid(),
  funnel_id  uuid not null references funnels(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type       text not null,          -- 'meta_ads' | 'whatsapp' | ... (taxonomy, FUNNEL_SCHEMA.md)
  category   text not null,          -- 'acquisition' | 'content' | ... 
  label      text not null,
  position   jsonb not null,         -- {x, y}
  size       jsonb,                  -- {width, height} quando redimensionável
  group_id   uuid references funnel_groups(id) on delete set null,
  data       jsonb not null default '{}'::jsonb,   -- FunnelNodeData (§10)
  metrics    jsonb not null default '{}'::jsonb,   -- {planned:{}, actual:{}} (§16, ambiguidade #3)
  z_index    integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on funnel_nodes (funnel_id);
create index on funnel_nodes (funnel_id, type);
create index on funnel_nodes using gin (data jsonb_path_ops);

create table funnel_edges (
  id         uuid primary key default gen_random_uuid(),
  funnel_id  uuid not null references funnels(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_id  uuid not null references funnel_nodes(id) on delete cascade,
  target_id  uuid not null references funnel_nodes(id) on delete cascade,
  source_handle text,
  target_handle text,
  label      text,                   -- "Converteu?" / "SIM" / "NÃO" (§11)
  condition  jsonb,                  -- condição estruturada quando houver
  style      jsonb not null default '{}'::jsonb,  -- {lineType, animated, color, marker}
  rate       numeric(6,4),           -- taxa de conversão desta aresta (§17, ambiguidade #4)
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint no_self_loop check (source_id <> target_id)
);
create index on funnel_edges (funnel_id);
create index on funnel_edges (source_id);
create index on funnel_edges (target_id);

create table funnel_groups (
  id         uuid primary key default gen_random_uuid(),
  funnel_id  uuid not null references funnels(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  label      text not null,          -- AQUISIÇÃO / QUALIFICAÇÃO / CONVERSÃO / RETENÇÃO
  stage      text,                   -- estágio semântico do funil
  position   jsonb not null,
  size       jsonb not null,         -- move e redimensiona (§12)
  color      text,
  collapsed  boolean not null default false,
  z_index    integer not null default -1,
  created_at timestamptz not null default now()
);
create index on funnel_groups (funnel_id);
```

`funnel_nodes.group_id` referencia `funnel_groups`, criada depois — a migration cria os
grupos antes dos nodes, ou adiciona a FK num `alter table` posterior.

### 3.4 Versionamento (§27)

```sql
create table funnel_versions (
  id          uuid primary key default gen_random_uuid(),
  funnel_id   uuid not null references funnels(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  version     integer not null,
  label       text,                  -- "Antes da sugestão da IA", "v12"
  snapshot    jsonb not null,        -- FunnelGraph completo
  trigger     text not null,         -- 'autosave' | 'manual' | 'ai_apply' | 'import' | 'restore'
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  unique (funnel_id, version)
);
create index on funnel_versions (funnel_id, created_at desc);
```

Retenção: últimas 50 versões por funil + todas as marcadas `manual`/`ai_apply`. Job de
limpeza mensal. Restaurar não apaga nada — cria uma versão nova com o conteúdo antigo.

### 3.5 Templates (§21, §22)

```sql
create table templates (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,  -- NULL = oficial (ambiguidade #7)
  slug         text not null,
  name         text not null,
  description  text,
  category     text not null,        -- 'saas' | 'low_ticket' | 'whatsapp' | 'sdr' | ...
  tags         text[] not null default '{}',
  thumbnail_url text,
  graph        jsonb not null,       -- FunnelGraph pronto para instanciar
  usage_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
);
```

Seed inicial traz o template **GD Frete** do §22 completo, com ramificações dos destaques e
o fluxo alternativo de não-ativação.

### 3.6 Compartilhamento (§20)

```sql
create type share_permission as enum ('view','comment','edit');

create table funnel_shares (
  id           uuid primary key default gen_random_uuid(),
  funnel_id    uuid not null references funnels(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  token_hash   text not null unique,     -- sha256 do token; o token só existe no link
  permission   share_permission not null default 'view',
  password_hash text,                    -- argon2id, opcional
  expires_at   timestamptz,
  revoked_at   timestamptz,
  view_count   integer not null default 0,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
```

### 3.7 Comentários (§26)

```sql
create table comments (
  id           uuid primary key default gen_random_uuid(),
  funnel_id    uuid not null references funnels(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  anchor_type  text not null,            -- 'node' | 'edge' | 'canvas'
  anchor_id    uuid,
  position     jsonb,                    -- para âncora livre no canvas
  body         text not null,
  author_id    uuid references profiles(id),
  author_name  text,                     -- visitante via share link
  parent_id    uuid references comments(id) on delete cascade,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index on comments (funnel_id) where resolved_at is null;
```

### 3.8 IA e agente (§39–§62)

```sql
create table ai_generations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  project_id    uuid references projects(id) on delete set null,
  funnel_id     uuid references funnels(id) on delete set null,
  user_id       uuid references profiles(id),
  kind          text not null,           -- 'generate' | 'analyze' | 'improve' | 'copy' | 'chat'
  mode          text,                    -- 'ask' | 'analyze' | 'act'
  provider      text not null default 'anthropic',
  model         text not null,
  input_tokens  integer, output_tokens integer,
  cache_read_tokens integer, cache_write_tokens integer,
  cost_usd      numeric(10,6),
  latency_ms    integer,
  status        text not null,           -- 'success' | 'error' | 'refused'
  error         text,
  request       jsonb,                   -- contexto enviado (sem segredos)
  response      jsonb,                   -- ChangeSet / análise
  applied       boolean not null default false,   -- §33: sugerido ≠ aplicado
  created_at    timestamptz not null default now()
);
create index on ai_generations (workspace_id, created_at desc);
```

`applied` é métrica de produto, não contabilidade: mede se o agente sugere coisa que as
pessoas realmente aceitam.

```sql
create table agent_sessions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id   uuid references projects(id) on delete cascade,
  funnel_id    uuid references funnels(id) on delete set null,
  user_id      uuid references profiles(id),
  title        text,
  mode         text not null default 'analyze',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table agent_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references agent_sessions(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role         text not null,            -- 'user' | 'assistant' | 'tool'
  content      jsonb not null,           -- blocos tipados
  change_set   jsonb,                    -- proposta pendente (§47)
  change_set_status text,                -- 'pending' | 'applied' | 'ignored'
  created_at   timestamptz not null default now()
);
create index on agent_messages (session_id, created_at);

create table agent_tool_calls (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid references agent_messages(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  tool_name    text not null,
  source       text not null,            -- 'internal' | 'mcp'
  mcp_server_id uuid references mcp_servers(id) on delete set null,
  category     text not null,            -- 'read' | 'write' | 'destructive'
  input        jsonb,
  output       jsonb,
  status       text not null,            -- 'ok' | 'error' | 'denied' | 'awaiting_confirmation' | 'timeout'
  confirmed_by uuid references profiles(id),
  latency_ms   integer,
  created_at   timestamptz not null default now()
);
create index on agent_tool_calls (workspace_id, created_at desc);
```

Essa tabela é a auditoria do §45 e §57 — quem executou, qual ferramenta, quando, resultado.

```sql
-- Memória estruturada (§52). Não é log de chat.
create table project_memory (
  project_id      uuid primary key references projects(id) on delete cascade,
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  product         jsonb,   -- {name, description, category}
  icp             jsonb,   -- perfil de cliente ideal
  offer           jsonb,   -- {promise, price, model, trial}
  goals           jsonb,
  constraints     jsonb,
  decisions       jsonb not null default '[]'::jsonb,       -- [{date, decision, rationale}]
  important_facts jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);
```

### 3.9 MCP e chaves (§43–§45, §51, §58, §59)

```sql
create type mcp_auth_type as enum ('none','bearer','oauth2');
create type mcp_status    as enum ('disconnected','connected','error','needs_config');

create table mcp_servers (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  url           text not null,
  auth_type     mcp_auth_type not null default 'none',
  credential_ciphertext bytea,      -- AES-256-GCM, server-side only
  credential_iv bytea,
  key_version   smallint not null default 1,
  status        mcp_status not null default 'needs_config',
  allowed_tools text[] not null default '{}',    -- allowlist (§45)
  tool_catalog  jsonb,                           -- cache do discovery
  enabled       boolean not null default true,
  metadata      jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  created_at    timestamptz not null default now()
);

-- Habilitação por projeto (§51): evita o agente misturar contextos
create table project_mcp_servers (
  project_id    uuid not null references projects(id) on delete cascade,
  mcp_server_id uuid not null references mcp_servers(id) on delete cascade,
  enabled       boolean not null default true,
  allowed_tools text[],                          -- restringe ainda mais que o servidor
  primary key (project_id, mcp_server_id)
);

-- BYOK (§58) — arquitetura pronta, feature desligada no MVP
create table workspace_ai_settings (
  workspace_id  uuid primary key references workspaces(id) on delete cascade,
  key_mode      text not null default 'system',  -- 'system' | 'byok'
  api_key_ciphertext bytea,
  api_key_iv    bytea,
  key_version   smallint not null default 1,
  key_hint      text,                            -- "sk-ant-…4f2a", só para reconhecer
  default_model text not null default 'claude-sonnet-5',
  monthly_token_budget bigint,
  updated_at    timestamptz not null default now()
);
```

**Regra dura**: nenhuma coluna `*_ciphertext` ou `*_iv` é legível pelo cliente. As policies
não concedem SELECT nelas; o acesso acontece só dentro de funções `SECURITY DEFINER` no
servidor. Uma vez salva, a chave nunca volta ao frontend (§58) — nem mascarada. `key_hint`
existe para o usuário reconhecer qual chave cadastrou, e é gravado no momento do cadastro.

---

## 4. RLS

### 4.1 Função base

```sql
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role(ws uuid)
returns workspace_role language sql stable security definer set search_path = public as $$
  select role from workspace_members
  where workspace_id = ws and user_id = auth.uid();
$$;
```

`security definer` + `search_path` fixo é o que impede recursão de policy e path hijacking.

### 4.2 Padrão aplicado a toda tabela com `workspace_id`

```sql
alter table funnels enable row level security;

create policy funnels_select on funnels for select
  using (public.is_workspace_member(workspace_id));

create policy funnels_insert on funnels for insert
  with check (public.is_workspace_member(workspace_id)
              and public.workspace_role(workspace_id) in ('owner','admin','editor'));

create policy funnels_update on funnels for update
  using (public.is_workspace_member(workspace_id)
         and public.workspace_role(workspace_id) in ('owner','admin','editor'))
  with check (public.is_workspace_member(workspace_id));

create policy funnels_delete on funnels for delete
  using (public.workspace_role(workspace_id) in ('owner','admin'));
```

Mesmo padrão em `projects`, `funnel_nodes`, `funnel_edges`, `funnel_groups`,
`funnel_versions`, `comments`, `templates` (workspace), `ai_generations`, `agent_*`,
`mcp_servers`, `project_memory`.

Casos especiais:

```sql
-- Templates oficiais: legíveis por qualquer autenticado, escreve só service_role
create policy templates_select_official on templates for select
  using (workspace_id is null or public.is_workspace_member(workspace_id));

-- Segredos: nenhum acesso via cliente
create policy mcp_no_client_access on mcp_servers for all
  using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) in ('owner','admin'));
revoke select (credential_ciphertext, credential_iv) on mcp_servers from authenticated;
revoke select (api_key_ciphertext, api_key_iv)      on workspace_ai_settings from authenticated;
```

Share links anônimos **não** são resolvidos por RLS com token em `current_setting`. São
resolvidos por Route Handler no servidor, que valida token/senha/expiração e responde com o
grafo já filtrado. Menos mágica, menos superfície de erro.

### 4.3 Testes de RLS
Suíte obrigatória em `tests/integration/rls.spec.ts`, rodando com dois usuários em
workspaces diferentes:
- ler funil alheio → 0 linhas
- escrever node em funil alheio → erro
- `viewer` tentando update → erro
- select em coluna de ciphertext → erro de permissão
- template oficial → legível por ambos

Policy nova sem teste correspondente não passa no review.

---

## 5. RPC principal

```sql
create or replace function public.save_funnel_graph(
  p_funnel_id uuid, p_changes jsonb, p_base_version integer
) returns jsonb language plpgsql security invoker as $$
-- 1. trava a linha do funil (select ... for update)
-- 2. se funnels.version <> p_base_version → retorna {conflict:true, version, graph}
-- 3. aplica as operações do diff (add/update/delete de node/edge/group)
-- 4. atualiza node_count, updated_at, version = version + 1
-- 5. cria funnel_versions se passou o limiar de autosnapshot
-- 6. retorna {ok:true, version}
$$;
```

Uma transação, um caminho de escrita, concorrência tratada. É aqui que o autosave do §25
encosta no banco.

---

## 6. Triggers e automações

- `updated_at` automático em `projects`, `funnels`, `funnel_nodes`, `project_memory`.
- `funnels.node_count` mantido pela RPC (não por trigger por linha — importar 500 nodes
  dispararia 500 triggers).
- Ao criar usuário: trigger em `auth.users` cria `profiles` + workspace pessoal + membership
  `owner`. Ninguém entra no produto sem workspace.
- `templates.usage_count` incrementado ao instanciar.

---

## 7. Índices — o que e por quê

| Índice | Motivo |
|---|---|
| `funnels (workspace_id, updated_at desc)` | dashboard ordenado por edição recente (§4) |
| `funnel_nodes (funnel_id)` | carregar canvas |
| `funnel_edges (source_id)` / `(target_id)` | vizinhança de node para contexto da IA (§56) e lint |
| `funnel_nodes gin (data)` | busca por propriedade (§29) |
| `agent_tool_calls (workspace_id, created_at desc)` | página de Usage (§57) |
| `comments (funnel_id) where resolved_at is null` | parcial: só comentário aberto importa na UI |

---

## 8. Ordem das migrations

```
0001_extensions.sql        pgcrypto, citext
0002_identity.sql          profiles, workspaces, workspace_members, trigger de signup
0003_projects_funnels.sql  projects, funnels
0004_graph.sql             funnel_groups, funnel_nodes, funnel_edges
0005_versions.sql          funnel_versions
0006_templates.sql         templates
0007_sharing.sql           funnel_shares, comments
0008_ai.sql                ai_generations, agent_sessions/messages/tool_calls, project_memory
0009_mcp.sql               mcp_servers, project_mcp_servers, workspace_ai_settings
0010_rls.sql               funções + todas as policies
0011_rpc.sql               save_funnel_graph e funções auxiliares
0012_seed_templates.sql    templates oficiais, incluindo GD Frete
```
