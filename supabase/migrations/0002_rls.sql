-- RLS: tudo é do dono, ponto. Sem exceção e sem tabela destravada.

alter table profiles       enable row level security;
alter table funnels        enable row level security;
alter table funnel_nodes   enable row level security;
alter table funnel_edges   enable row level security;
alter table metric_entries enable row level security;
alter table tasks          enable row level security;

create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy funnels_owner on funnels
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy funnel_nodes_owner on funnel_nodes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy funnel_edges_owner on funnel_edges
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy metric_entries_owner on metric_entries
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy tasks_owner on tasks
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
