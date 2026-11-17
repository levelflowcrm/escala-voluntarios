-- =============================================================================
-- "Cheguei" só vale no local: o celular envia a posição no momento do toque e o banco confere a distância até a igreja.
--   * As coordenadas NÃO são guardadas: só se usa para decidir se aceita a chegada.
--   * A versão antiga registrar_chegada(uuid) sai do ar (senão burlaria a checagem).
--   * Igreja sem coordenadas cadastradas: a checagem é dispensada (outras igrejas, no futuro).
-- =============================================================================
alter table igrejas
  add column latitude double precision,
  add column longitude double precision,
  add column raio_cheguei_m integer not null default 250 check (raio_cheguei_m between 50 and 2000);

-- Igreja Nasci Pra Deus: Av. Monteiro Lobato, 1522 — Macedo, Guarulhos/SP
update igrejas set latitude = -23.465533, longitude = -46.5133597 where slug = 'nasci-pra-deus';

drop function registrar_chegada(uuid);

create function registrar_chegada(p_escala uuid, p_lat double precision, p_lng double precision, p_precisao double precision default null)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  e record;
  ig record;
  agora timestamptz := now();
  dist double precision;
  folga double precision;
begin
  select es.status, es.chegou_em, ev.inicio, ev.igreja_id, coalesce(em.publicada, false) as publicada
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

  select latitude, longitude, raio_cheguei_m into ig from igrejas where id = e.igreja_id;
  if ig.latitude is not null and ig.longitude is not null then
    if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      raise exception 'Precisamos da sua localização para confirmar que você está na igreja';
    end if;
    -- distância em metros (haversine)
    dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_lat - ig.latitude) / 2), 2) +
      cos(radians(ig.latitude)) * cos(radians(p_lat)) * power(sin(radians(p_lng - ig.longitude) / 2), 2)
    ));
    -- o GPS dentro de prédio erra; damos folga igual à imprecisão informada (no máximo 150 m)
    folga := least(greatest(coalesce(p_precisao, 0), 0), 150);
    if dist > ig.raio_cheguei_m + folga then
      raise exception 'Você parece estar longe da igreja. O "Cheguei" só funciona quando você está no local';
    end if;
  end if;

  update escalas
     set chegou_em = agora,
         status = 'confirmado',
         respondido_em = coalesce(respondido_em, agora)
   where id = p_escala;
  return agora;
end $$;
revoke all on function registrar_chegada(uuid, double precision, double precision, double precision) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function registrar_chegada(uuid, double precision, double precision, double precision) to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function registrar_chegada(uuid, double precision, double precision, double precision) from anon';
  end if;
end $$;
