-- Bucket privado para os prints. Nada de URL pública: acesso só por signed URL.

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

-- Caminho obrigatório: {user_id}/{funnel_id}/{arquivo}
-- A primeira pasta ser o uid é o que faz a policy funcionar por prefixo.
create policy screenshots_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy screenshots_select on storage.objects
  for select to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

create policy screenshots_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
