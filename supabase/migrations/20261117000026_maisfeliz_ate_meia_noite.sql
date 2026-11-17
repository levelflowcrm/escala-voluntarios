-- =============================================================================
-- MaisFeliz: a janela para avaliar passa a fechar à meia-noite (horário de
-- Brasília) do mesmo dia do culto, em vez de 36 h depois. Quanto mais perto do
-- culto, maior a chance de o voluntário lembrar e responder.
-- Abre 1 h depois do início (como antes).
-- =============================================================================
create or replace function maisfeliz_pendentes()
returns table (evento_id uuid, titulo text, inicio timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct ev.id, ev.titulo, ev.inicio
    from escalas es
    join eventos ev on ev.id = es.evento_id
    join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
   where es.pessoa_id = minha_pessoa()
     and (es.status = 'confirmado' or es.chegou_em is not null)
     and now() >= ev.inicio + interval '1 hour'
     and now() < ((date_trunc('day', ev.inicio at time zone 'America/Sao_Paulo') + interval '1 day') at time zone 'America/Sao_Paulo')
     and not exists (select 1 from maisfeliz_participacao mp where mp.evento_id = ev.id and mp.pessoa_id = es.pessoa_id)
   order by ev.inicio desc
$$;

create or replace function registrar_maisfeliz(p_evento uuid, p_nota int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := minha_pessoa();
  min uuid;
begin
  if eu is null then raise exception 'Sem cadastro'; end if;
  if p_nota is null or p_nota not between 1 and 5 then raise exception 'Nota inválida'; end if;
  select es.ministerio_id into min
    from escalas es
    join eventos ev on ev.id = es.evento_id
    join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
   where es.evento_id = p_evento and es.pessoa_id = eu
     and (es.status = 'confirmado' or es.chegou_em is not null)
     and now() >= ev.inicio + interval '1 hour'
     and now() < ((date_trunc('day', ev.inicio at time zone 'America/Sao_Paulo') + interval '1 day') at time zone 'America/Sao_Paulo')
   order by es.ministerio_id
   limit 1;
  if min is null then raise exception 'Você não pode avaliar este evento agora'; end if;
  begin
    insert into maisfeliz_participacao (evento_id, pessoa_id) values (p_evento, eu);
  exception when unique_violation then
    raise exception 'Você já avaliou este evento';
  end;
  insert into maisfeliz_votos (evento_id, ministerio_id, nota) values (p_evento, min, p_nota);
end $$;
