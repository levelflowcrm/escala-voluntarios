-- =============================================================================
-- Pontuação do voluntário (últimos 90 dias). Cada pessoa vê a própria; o
-- coordenador vê a de quem está nos ministérios que ele coordena. Sem ranking público.
--
--   +10  por escala servida (confirmada, evento já realizado, escala publicada)
--   + 3  por chegada no horário ("Cheguei" até a hora do início)
--   + 8  por colega coberto (troca aceita em que a pessoa cobriu)
--   + 8  por vaga aberta assumida
--   + 2  por escala da sequência atual sem faltar (até 10 => máx. +20)
--   - 4  por escala recusada
--   - 2  por troca pedida e aceita (a pessoa saiu da escala)
--   - 6  por escala que ficou sem resposta até o evento passar
--
-- Níveis: semente (0-39), bronze (40-119), prata (120-239), ouro (240+).
-- A pontuação nunca fica abaixo de zero.
-- =============================================================================
alter table escalas add column assumida boolean not null default false;

-- Mesma função de antes; agora marca a escala como "vaga assumida"
create or replace function assumir_vaga(p_evento uuid, p_funcao uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := minha_pessoa();
  novo uuid;
  mid uuid;
begin
  if eu is null then raise exception 'Você não está cadastrado(a) nesta igreja'; end if;
  if not pode_assumir_vaga(eu, p_evento, p_funcao) then
    raise exception 'Essa vaga não está mais disponível para você';
  end if;
  select ministerio_id into mid from funcoes where id = p_funcao;
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, papel, status, respondido_em, assumida)
  values (p_evento, mid, p_funcao, eu, 'titular', 'confirmado', now(), true)
  returning id into novo;
  return novo;
exception when unique_violation then
  raise exception 'Essa vaga já foi assumida por outra pessoa';
end $$;
revoke all on function assumir_vaga(uuid, uuid) from public;

-- Cálculo (interno): quem chama decide quem pode ver
create function calcular_pontuacao(p_pessoa uuid)
returns table (pontos int, nivel text, servidas int, no_horario int, cobriu int, assumiu int,
               trocou int, recusou int, sem_resposta int, sequencia int)
language plpgsql stable security definer set search_path = public as $$
declare
  v_serv int; v_hora int; v_assum int; v_rec int; v_sem int; v_cobriu int; v_trocou int; v_seq int; v_pts int;
begin
  select count(*) filter (where es.status = 'confirmado' and ev.inicio < now()),
         count(*) filter (where es.status = 'confirmado' and ev.inicio < now()
                            and es.chegou_em is not null and es.chegou_em <= ev.inicio),
         count(*) filter (where es.status = 'confirmado' and ev.inicio < now() and es.assumida),
         count(*) filter (where es.status = 'recusado'),
         count(*) filter (where es.status = 'pendente' and ev.inicio < now())
    into v_serv, v_hora, v_assum, v_rec, v_sem
    from escalas es
    join eventos ev on ev.id = es.evento_id
    join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
   where es.pessoa_id = p_pessoa and ev.inicio >= now() - interval '90 days';

  select count(*) into v_cobriu
    from trocas t join escalas e on e.id = t.escala_id join eventos ev on ev.id = e.evento_id
   where t.colega_id = p_pessoa and t.status = 'aceita' and ev.inicio >= now() - interval '90 days';
  select count(*) into v_trocou
    from trocas t join escalas e on e.id = t.escala_id join eventos ev on ev.id = e.evento_id
   where t.solicitante_id = p_pessoa and t.status = 'aceita' and ev.inicio >= now() - interval '90 days';

  -- Sequência (mesma janela de 90 dias): escalas realizadas, da mais recente para trás, até a primeira recusa, troca ou falta de resposta
  with h as (
    select es.status, row_number() over (order by ev.inicio desc) as rn
      from escalas es
      join eventos ev on ev.id = es.evento_id
      join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
     where es.pessoa_id = p_pessoa and ev.inicio < now() and ev.inicio >= now() - interval '90 days' and es.status in ('confirmado', 'recusado', 'pendente', 'trocado')
  )
  select coalesce(min(rn) filter (where status <> 'confirmado') - 1, count(*))::int into v_seq from h;

  v_pts := greatest(0, 10 * v_serv + 3 * v_hora + 8 * v_cobriu + 8 * v_assum + 2 * least(v_seq, 10)
                       - 4 * v_rec - 2 * v_trocou - 6 * v_sem);
  return query select v_pts,
    case when v_pts >= 240 then 'ouro' when v_pts >= 120 then 'prata' when v_pts >= 40 then 'bronze' else 'semente' end,
    v_serv, v_hora, v_cobriu, v_assum, v_trocou, v_rec, v_sem, v_seq;
end $$;
revoke all on function calcular_pontuacao(uuid) from public;

create function minha_pontuacao()
returns table (pontos int, nivel text, servidas int, no_horario int, cobriu int, assumiu int,
               trocou int, recusou int, sem_resposta int, sequencia int)
language sql stable security definer set search_path = public as $$
  select * from calcular_pontuacao(minha_pessoa()) where minha_pessoa() is not null
$$;

create function pontuacao_do_time()
returns table (pessoa_id uuid, pessoa text, pontos int, nivel text, servidas int, no_horario int, cobriu int,
               assumiu int, trocou int, recusou int, sem_resposta int, sequencia int)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, c.*
    from pessoas p
    cross join lateral calcular_pontuacao(p.id) c
   where p.ativo
     and exists (select 1 from membros_ministerio mm
                 where mm.pessoa_id = p.id and sou_coordenador(mm.ministerio_id))
   order by c.pontos desc, p.nome
$$;

revoke all on function minha_pontuacao(), pontuacao_do_time() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function minha_pontuacao(), pontuacao_do_time() to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function minha_pontuacao(), pontuacao_do_time(), calcular_pontuacao(uuid), assumir_vaga(uuid, uuid) from anon';
  end if;
end $$;
