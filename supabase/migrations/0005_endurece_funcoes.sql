-- Avisos do linter de segurança do Supabase.

-- search_path fixo: sem isso, quem controla o search_path da sessão pode fazer
-- a função resolver outro objeto com o mesmo nome.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Função de trigger não precisa ser chamável pela API REST por ninguém.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- owns_funnel é usada DENTRO das policies, então `authenticated` precisa poder
-- executá-la — o linter continua sinalizando isso e a sinalização é esperada.
-- Chamada direta ela devolve só um booleano sobre a posse do próprio usuário,
-- sem expor dado. Para `anon` é revogada: sem sessão ela só responderia false.
revoke execute on function public.owns_funnel(uuid) from public, anon;
grant execute on function public.owns_funnel(uuid) to authenticated;
