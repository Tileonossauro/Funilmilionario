-- GD Funnel Builder — schema inicial
-- Uma conta = seus funis. Sem workspace, sem time, sem projeto (ver PLAN.md).

create extension if not exists pgcrypto;

-- ── Perfil ───────────────────────────────────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nome       text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Funis ────────────────────────────────────────────────────────────────────
create type funnel_status as enum ('rascunho', 'ativo', 'pausado', 'arquivado');

create table funnels (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  nome        text not null,
  descricao   text,
  status      funnel_status not null default 'rascunho',
  viewport    jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  node_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index funnels_owner_idx on funnels (owner_id, updated_at desc);

-- ── Grafo ────────────────────────────────────────────────────────────────────
create table funnel_nodes (
  id         uuid primary key default gen_random_uuid(),
  funnel_id  uuid not null references funnels(id) on delete cascade,
  owner_id   uuid not null references profiles(id) on delete cascade,
  type       text not null,
  position   jsonb not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funnel_nodes_funnel_idx on funnel_nodes (funnel_id);

create table funnel_edges (
  id         uuid primary key default gen_random_uuid(),
  funnel_id  uuid not null references funnels(id) on delete cascade,
  owner_id   uuid not null references profiles(id) on delete cascade,
  source_id  uuid not null references funnel_nodes(id) on delete cascade,
  target_id  uuid not null references funnel_nodes(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sem_auto_loop check (source_id <> target_id)
);
create index funnel_edges_funnel_idx on funnel_edges (funnel_id);
create unique index funnel_edges_unicos on funnel_edges (source_id, target_id);

-- ── Lançamentos de métricas ──────────────────────────────────────────────────
-- Log append-only. Cada lançamento é uma linha com período próprio; o node mostra
-- o mais recente, mas o histórico inteiro fica para comparar evolução.
create table metric_entries (
  id            uuid primary key default gen_random_uuid(),
  node_id       uuid not null references funnel_nodes(id) on delete cascade,
  funnel_id     uuid not null references funnels(id) on delete cascade,
  owner_id      uuid not null references profiles(id) on delete cascade,
  periodo_de    date not null,
  periodo_ate   date not null,
  valores       jsonb not null,
  origem        text not null default 'manual',   -- 'manual' | 'screenshot'
  screenshot_path text,
  observacao    text,
  created_at    timestamptz not null default now(),
  constraint periodo_valido check (periodo_ate >= periodo_de),
  constraint origem_valida check (origem in ('manual', 'screenshot'))
);
create index metric_entries_node_idx on metric_entries (node_id, periodo_ate desc);
create index metric_entries_owner_idx on metric_entries (owner_id, created_at desc);

-- ── Tarefas ──────────────────────────────────────────────────────────────────
create table tasks (
  id         uuid primary key default gen_random_uuid(),
  funnel_id  uuid not null references funnels(id) on delete cascade,
  node_id    uuid references funnel_nodes(id) on delete cascade,
  owner_id   uuid not null references profiles(id) on delete cascade,
  titulo     text not null,
  vencimento date not null,
  status     text not null default 'aberta',
  origem     text not null default 'manual',      -- 'regra' | 'manual'
  created_at timestamptz not null default now(),
  concluida_em timestamptz,
  constraint status_valido check (status in ('aberta', 'feita')),
  constraint origem_task_valida check (origem in ('regra', 'manual'))
);
create index tasks_owner_abertas_idx on tasks (owner_id, vencimento) where status = 'aberta';
create index tasks_funnel_idx on tasks (funnel_id);

-- ── updated_at automático ────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger funnels_touch before update on funnels
  for each row execute function public.touch_updated_at();
create trigger funnel_nodes_touch before update on funnel_nodes
  for each row execute function public.touch_updated_at();
