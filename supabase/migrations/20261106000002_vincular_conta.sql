-- =============================================================================
-- Liga a conta de login (Supabase Auth) ao cadastro da pessoa pelo e-mail.
--
-- O coordenador cadastra o e-mail do voluntário. No primeiro login (link por
-- e-mail ou Google), o app chama vincular_conta() e o cadastro fica ligado.
-- Quem entra com um e-mail que não está cadastrado não vê nada.
-- =============================================================================

create unique index if not exists pessoas_email_unico
  on pessoas (igreja_id, lower(email)) where email is not null;

create function vincular_conta() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  meu_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  pessoa uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select id into pessoa from pessoas where auth_user_id = auth.uid();
  if pessoa is not null then
    return pessoa;
  end if;

  if meu_email = '' then
    return null;
  end if;

  update pessoas set auth_user_id = auth.uid()
   where lower(email) = meu_email and auth_user_id is null
   returning id into pessoa;
  return pessoa;
end $$;

revoke all on function vincular_conta() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function vincular_conta() to authenticated';
  end if;
end $$;
