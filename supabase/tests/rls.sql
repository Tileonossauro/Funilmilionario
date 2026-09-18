-- Teste de RLS. Roda no SQL Editor do Supabase; não devolve linhas quando passa,
-- e levanta exceção nomeando a falha quando algo vaza.
--
-- Rode isto a cada policy nova. Foi assim que a falha corrigida em
-- 0004_rls_valida_dono_do_funil.sql apareceu — revisão de código não pegou.

do $$
declare
  ana uuid := gen_random_uuid(); bruno uuid := gen_random_uuid();
  f_ana uuid; n_ana uuid; n2_ana uuid; f_bruno uuid;
  visiveis int; vazou text := ''; legitimo boolean := true;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values (ana,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ana@teste.local','x',now(),now()),
         (bruno,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','bruno@teste.local','x',now(),now());

  if (select count(*) from profiles where id in (ana,bruno)) <> 2 then
    raise exception 'trigger on_auth_user_created nao criou os perfis';
  end if;

  insert into funnels (owner_id, nome) values (ana,'Funil da Ana') returning id into f_ana;
  insert into funnel_nodes (funnel_id, owner_id, type, position, data)
    values (f_ana, ana, 'landing_page','{"x":0,"y":0}','{"label":"LP"}') returning id into n_ana;
  insert into funnel_nodes (funnel_id, owner_id, type, position, data)
    values (f_ana, ana, 'whatsapp','{"x":0,"y":200}','{"label":"WPP"}') returning id into n2_ana;
  insert into funnels (owner_id, nome) values (bruno,'Funil do Bruno') returning id into f_bruno;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub',bruno,'role','authenticated')::text, true);

  -- leitura
  select count(*) into visiveis from funnels;
  if visiveis <> 1 then raise exception 'leitura: Bruno deveria ver so o dele, viu %', visiveis; end if;
  select count(*) into visiveis from funnel_nodes;
  if visiveis <> 0 then raise exception 'leitura: Bruno viu etapas alheias'; end if;

  -- escrita cruzada
  begin
    insert into funnel_nodes (funnel_id, owner_id, type, position, data)
      values (f_ana, bruno, 'whatsapp','{"x":0,"y":0}','{"label":"invasao"}');
    vazou := vazou || 'etapa-no-funil-alheio ';
  exception when others then null; end;

  begin
    insert into funnel_edges (funnel_id, owner_id, source_id, target_id, data)
      values (f_bruno, bruno, n_ana, n2_ana, '{}');
    vazou := vazou || 'conexao-em-nodes-alheios ';
  exception when others then null; end;

  begin
    insert into metric_entries (node_id, funnel_id, owner_id, periodo_de, periodo_ate, valores, origem)
      values (n_ana, f_bruno, bruno, '2026-09-01','2026-09-15','{"leads":1}','manual');
    vazou := vazou || 'lancamento-em-node-alheio ';
  exception when others then null; end;

  begin
    insert into tasks (funnel_id, node_id, owner_id, titulo, vencimento, origem)
      values (f_bruno, n_ana, bruno, 'invasao','2026-09-30','manual');
    vazou := vazou || 'tarefa-em-node-alheio ';
  exception when others then null; end;

  begin
    update funnels set simulacao = '{"ativa":true}'::jsonb where id = f_ana;
    if found then vazou := vazou || 'simulacao-em-funil-alheio '; end if;
  exception when others then null; end;

  begin
    update funnels set areas = '[{"id":"topo","label":"invasao","cor":"cinza","altura":300}]'::jsonb
    where id = f_ana;
    if found then vazou := vazou || 'areas-em-funil-alheio '; end if;
  exception when others then null; end;

  -- caminho legitimo do proprio dono precisa continuar inteiro
  begin
    insert into funnel_nodes (funnel_id, owner_id, type, position, data)
      values (f_bruno, bruno, 'oferta','{"x":0,"y":0}','{"label":"minha oferta","preco":29.9}');
    update funnels set simulacao = '{"ativa":true,"volume":10000}'::jsonb where id = f_bruno;
    update funnels set areas = '[{"id":"topo","label":"Topo","cor":"violeta","altura":420}]'::jsonb
    where id = f_bruno;
    insert into metric_entries (node_id, funnel_id, owner_id, periodo_de, periodo_ate, valores, origem)
      select id, f_bruno, bruno, '2026-09-01','2026-09-15','{"cliques":10}','manual'
      from funnel_nodes where funnel_id = f_bruno limit 1;
    insert into tasks (funnel_id, node_id, owner_id, titulo, vencimento, origem)
      select f_bruno, id, bruno, 'conferir','2026-09-30','regra'
      from funnel_nodes where funnel_id = f_bruno limit 1;
  exception when others then legitimo := false; end;

  reset role;
  if vazou <> '' then raise exception 'AINDA VAZA: %', vazou; end if;
  if not legitimo then raise exception 'REGRESSAO: dono nao consegue escrever no proprio funil'; end if;

  raise notice 'RLS OK: invasoes bloqueadas, caminho legitimo intacto';
  delete from auth.users where id in (ana, bruno);
end $$;
