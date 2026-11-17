-- =============================================================================
-- Barra contas vazias: só cria conta de login quem já foi cadastrado pelo coordenador.
--
-- Até aqui, qualquer pessoa com Google conseguia criar uma conta no app; ela caía em
-- "Quase lá!" sem ver nada (as políticas de segurança já impedem o acesso). Agora o
-- cadastro da conta é recusado no banco quando o e-mail não está em `pessoas`.
--   * só vale para contas NOVAS: quem já tem conta continua entrando normalmente;
--   * o e-mail é comparado sem diferenciar maiúsculas de minúsculas;
--   * o coordenador precisa cadastrar o e-mail do voluntário ANTES do primeiro acesso.
-- =============================================================================
create function email_cadastrado(p_email text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pessoas where lower(email) = lower(btrim(coalesce(p_email, ''))) and btrim(coalesce(email, '')) <> '');
$$;
revoke all on function email_cadastrado(text) from public, anon, authenticated;

create function tg_barra_conta_sem_cadastro()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not email_cadastrado(new.email) then
    raise exception 'E-mail não cadastrado no Mais Conectados' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function tg_barra_conta_sem_cadastro() from public, anon, authenticated;

-- O schema "auth" é do Supabase; em bancos de teste sem ele, só as funções acima existem.
do $$
begin
  if to_regclass('auth.users') is not null then
    execute 'drop trigger if exists barra_conta_sem_cadastro on auth.users';
    execute 'create trigger barra_conta_sem_cadastro before insert on auth.users for each row execute function public.tg_barra_conta_sem_cadastro()';
  end if;
end $$;
