-- Funções internas de regra (aceitam qualquer pessoa como parâmetro) não devem ser
-- chamadas direto pela API: só as funções públicas do app (security definer) as usam.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke execute on function pode_assumir_vaga(uuid, uuid, uuid), pode_cobrir(uuid, uuid) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function pode_assumir_vaga(uuid, uuid, uuid), pode_cobrir(uuid, uuid) from anon';
  end if;
end $$;
