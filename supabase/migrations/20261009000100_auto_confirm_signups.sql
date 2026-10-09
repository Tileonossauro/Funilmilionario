-- GostoSAH has no e-mail step: a new account is confirmed as it is created, so signing up signs
-- in at once (the app retries the sign-in right after the sign-up).
create or replace function public.gostosah_autoconfirm() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end $$;

revoke all on function public.gostosah_autoconfirm() from public, anon, authenticated;

create trigger gostosah_autoconfirm before insert on auth.users
  for each row execute function public.gostosah_autoconfirm();
