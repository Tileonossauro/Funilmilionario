-- node_count era mantido pela aplicação: a cada etapa criada, uma consulta de
-- contagem mais um update, além de uma verificação extra de sessão. Três idas ao
-- banco no caminho crítico de um clique. O banco faz isso sozinho e de graça.

create or replace function public.sync_node_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update funnels set node_count = node_count + 1 where id = new.funnel_id;
    return new;
  end if;

  -- Quando o próprio funil está sendo apagado em cascata, o update não encontra
  -- linha e simplesmente não faz nada — que é o comportamento correto aqui.
  update funnels set node_count = greatest(node_count - 1, 0) where id = old.funnel_id;
  return old;
end;
$$;

revoke execute on function public.sync_node_count() from public, anon, authenticated;

drop trigger if exists funnel_nodes_count on funnel_nodes;
create trigger funnel_nodes_count
  after insert or delete on funnel_nodes
  for each row execute function public.sync_node_count();

update funnels f
set node_count = coalesce((select count(*) from funnel_nodes n where n.funnel_id = f.id), 0);
