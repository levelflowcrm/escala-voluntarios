-- O facilitador vê (já via leitura) e agora também edita a disponibilidade dos voluntários dos seus ministérios:
-- dias da semana, ausências, dias marcados no calendário e preferências.

create or replace function coordeno_pessoa(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros_ministerio mm
    where mm.pessoa_id = p and sou_coordenador(mm.ministerio_id)
  )
$$;

revoke all on function coordeno_pessoa(uuid) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function coordeno_pessoa(uuid) to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function coordeno_pessoa(uuid) from anon';
  end if;
end $$;

create policy facilitador on indisponibilidades for all
  using (coordeno_pessoa(pessoa_id)) with check (coordeno_pessoa(pessoa_id));
create policy facilitador on bloqueios for all
  using (coordeno_pessoa(pessoa_id)) with check (coordeno_pessoa(pessoa_id));
create policy facilitador on dias_disponiveis for all
  using (coordeno_pessoa(pessoa_id)) with check (coordeno_pessoa(pessoa_id));
create policy facilitador on preferencias for all
  using (coordeno_pessoa(pessoa_id)) with check (coordeno_pessoa(pessoa_id));
