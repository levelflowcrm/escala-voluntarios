-- Níveis da pontuação como crescimento de uma planta (sem medalhas):
-- semente 0-29, plantinha 30-69, arbusto 70-119, árvore 120-179, árvore frutífera 180+.
-- Só muda o nome dos níveis e o corte máximo; as regras de pontos continuam as mesmas.
create or replace function calcular_pontuacao(p_pessoa uuid)
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
    case when v_pts >= 180 then 'frutifera' when v_pts >= 120 then 'arvore' when v_pts >= 70 then 'arbusto' when v_pts >= 30 then 'plantinha' else 'semente' end,
    v_serv, v_hora, v_cobriu, v_assum, v_trocou, v_rec, v_sem, v_seq;
end $$;
