-- =============================================================================
-- "Cheguei": o voluntário avisa no dia que já está na igreja e o coordenador vê.
--
--   escalas.chegou_em          -> quando a pessoa confirmou a chegada
--   registrar_chegada(escala)  -> só a própria pessoa, escala publicada e ativa,
--                                 de 3 h antes até 4 h depois do início do evento;
--                                 se ainda estava "pendente", passa a "confirmado"
--   chegadas_do_dia()          -> o coordenador vê quem está escalado nas próximas
--                                 16 h (e nas últimas 6 h) e quem já chegou
--
-- O voluntário não tem política de UPDATE em escalas: só consegue marcar a
-- chegada por esta função (com as regras acima).
-- =============================================================================
alter table escalas add column chegou_em timestamptz;

create function registrar_chegada(p_escala uuid)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  e record;
  agora timestamptz := now();
begin
  select es.status, es.chegou_em, ev.inicio, coalesce(em.publicada, false) as publicada
    into e
    from escalas es
    join eventos ev on ev.id = es.evento_id
    left join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id
   where es.id = p_escala and es.pessoa_id = minha_pessoa();
  if not found then
    raise exception 'Escala não encontrada';
  end if;
  if e.status not in ('pendente', 'confirmado') then
    raise exception 'Esta escala não está ativa';
  end if;
  if not e.publicada then
    raise exception 'A escala ainda não foi publicada';
  end if;
  if e.chegou_em is not null then
    return e.chegou_em; -- já avisou: não muda o horário nem avisa de novo
  end if;
  if agora < e.inicio - interval '3 hours' or agora > e.inicio + interval '4 hours' then
    raise exception 'O botão Cheguei abre 3 horas antes do início do evento';
  end if;
  update escalas
     set chegou_em = agora,
         status = 'confirmado',
         respondido_em = coalesce(respondido_em, agora)
   where id = p_escala;
  return agora;
end $$;
revoke all on function registrar_chegada(uuid) from public;

create function chegadas_do_dia()
returns table (escala_id uuid, pessoa_id uuid, pessoa text, funcao text, ministerio text,
               evento text, inicio timestamptz, chegou_em timestamptz)
language sql stable as $$
  select es.id, es.pessoa_id, p.nome, f.nome, m.nome, ev.titulo, ev.inicio, es.chegou_em
    from escalas es
    join pessoas p on p.id = es.pessoa_id
    join eventos ev on ev.id = es.evento_id
    join ministerios m on m.id = es.ministerio_id
    join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
    left join funcoes f on f.id = es.funcao_id
   where sou_coordenador(es.ministerio_id)
     and es.status in ('pendente', 'confirmado')
     and ev.inicio between now() - interval '6 hours' and now() + interval '16 hours'
   order by ev.inicio, (es.chegou_em is null), es.chegou_em, p.nome
$$;
revoke all on function chegadas_do_dia() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function registrar_chegada(uuid) to authenticated';
    execute 'grant execute on function chegadas_do_dia() to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function registrar_chegada(uuid), chegadas_do_dia() from anon';
  end if;
end $$;
