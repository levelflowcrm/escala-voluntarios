-- Criar automático: o rodízio precisa saber quem já está ocupado em QUALQUER
-- ministério (inclusive rascunhos que o coordenador não enxerga), sem expor
-- detalhes: só devolve "esta pessoa está ocupada neste evento".
create function ocupacoes_do_periodo(p_inicio timestamptz, p_fim timestamptz)
returns table (evento_id uuid, pessoa_id uuid)
language sql stable security definer set search_path = public as $$
  select distinct e.evento_id, e.pessoa_id
  from escalas e
  join eventos ev on ev.id = e.evento_id
  where sou_coordenador_algum()
    and ev.igreja_id = minha_igreja()
    and ev.inicio >= p_inicio and ev.inicio < p_fim
    and e.status in ('pendente', 'confirmado')
$$;

do $$
begin
  execute 'revoke execute on function ocupacoes_do_periodo(timestamptz, timestamptz) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function ocupacoes_do_periodo(timestamptz, timestamptz) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function ocupacoes_do_periodo(timestamptz, timestamptz) to authenticated';
  end if;
end $$;
