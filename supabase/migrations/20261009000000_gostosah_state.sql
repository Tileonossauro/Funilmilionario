-- One row per account: the app's whole state document (the same JSON the app keeps in
-- localStorage), merged on the device before every write (frontend/src/lib/cloud.js).
create table public.gostosah_state (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.gostosah_state enable row level security;

create policy "own row: select" on public.gostosah_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own row: insert" on public.gostosah_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own row: update" on public.gostosah_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own row: delete" on public.gostosah_state
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.gostosah_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger gostosah_state_touch before insert or update on public.gostosah_state
  for each row execute function public.gostosah_touch();

revoke all on public.gostosah_state from anon;
grant select, insert, update, delete on public.gostosah_state to authenticated;
