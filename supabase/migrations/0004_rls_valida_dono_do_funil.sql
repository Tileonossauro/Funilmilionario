-- Falha encontrada em teste (não em revisão): checar apenas owner_id na própria
-- linha deixa qualquer usuário INSERIR etapas, conexões, lançamentos e tarefas
-- dentro do funil de outra pessoa — basta declarar a linha como sua. A leitura
-- estava protegida; a escrita não. Toda tabela filha passa a exigir dono do funil.

create or replace function public.owns_funnel(f uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from funnels where id = f and owner_id = auth.uid());
$$;

drop policy if exists funnel_nodes_owner on funnel_nodes;
create policy funnel_nodes_owner on funnel_nodes
  for all
  using (owner_id = auth.uid() and public.owns_funnel(funnel_id))
  with check (owner_id = auth.uid() and public.owns_funnel(funnel_id));

-- Edges: além do funil, as duas pontas precisam morar nesse mesmo funil,
-- senão dá para costurar uma conexão para dentro do grafo alheio.
drop policy if exists funnel_edges_owner on funnel_edges;
create policy funnel_edges_owner on funnel_edges
  for all
  using (owner_id = auth.uid() and public.owns_funnel(funnel_id))
  with check (
    owner_id = auth.uid()
    and public.owns_funnel(funnel_id)
    and exists (select 1 from funnel_nodes n where n.id = source_id and n.funnel_id = funnel_edges.funnel_id)
    and exists (select 1 from funnel_nodes n where n.id = target_id and n.funnel_id = funnel_edges.funnel_id)
  );

-- Lançamentos: o node precisa pertencer ao funil informado, senão dá para
-- gravar número no node de outra pessoa apontando para um funil próprio.
drop policy if exists metric_entries_owner on metric_entries;
create policy metric_entries_owner on metric_entries
  for all
  using (owner_id = auth.uid() and public.owns_funnel(funnel_id))
  with check (
    owner_id = auth.uid()
    and public.owns_funnel(funnel_id)
    and exists (select 1 from funnel_nodes n where n.id = node_id and n.funnel_id = metric_entries.funnel_id)
  );

-- Tarefas: node_id é opcional, mas quando vem tem de ser do mesmo funil.
drop policy if exists tasks_owner on tasks;
create policy tasks_owner on tasks
  for all
  using (owner_id = auth.uid() and public.owns_funnel(funnel_id))
  with check (
    owner_id = auth.uid()
    and public.owns_funnel(funnel_id)
    and (
      node_id is null
      or exists (select 1 from funnel_nodes n where n.id = node_id and n.funnel_id = tasks.funnel_id)
    )
  );
