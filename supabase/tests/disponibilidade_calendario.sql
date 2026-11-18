-- Disponibilidade com calendário: dia marcado vale acima da regra semanal; "só dias marcados"; bloqueio vence tudo.
\set ON_ERROR_STOP 1
do $$
declare
  tm uuid; f uuid; ig uuid; ev uuid; a uuid; b uuid; dia date; dow int;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  insert into membros_ministerio (pessoa_id, ministerio_id) values (a, tm), (b, tm) on conflict do nothing;
  insert into habilitacoes (pessoa_id, funcao_id, nivel) values (a, f, 'apto'), (b, f, 'apto')
    on conflict (pessoa_id, funcao_id) do update set nivel = excluded.nivel;
  delete from indisponibilidades where pessoa_id = b;
  delete from preferencias where pessoa_id = b;

  insert into eventos (igreja_id, titulo, inicio)
    values (ig, 'Culto calendario', date_trunc('day', now()) + interval '30 days' + interval '22 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, a, 'pendente');
  update escalas set status = 'recusado' where evento_id = ev and pessoa_id = a;
  select (inicio at time zone 'America/Sao_Paulo')::date, extract(dow from inicio at time zone 'America/Sao_Paulo')::int into dia, dow from eventos where id = ev;

  -- Sem regra nenhuma: pode
  if not pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: livre deveria poder'; end if;

  -- Regra semanal "nunca nesse dia da semana": não pode
  insert into indisponibilidades (pessoa_id, dia_semana) values (b, dow);
  if pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: regra semanal ignorada'; end if;

  -- Dia marcado no calendário vale acima da regra semanal
  insert into dias_disponiveis (pessoa_id, dia) values (b, dia);
  if not pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: dia marcado deveria liberar'; end if;

  -- Bloqueio (viagem) vence o dia marcado
  insert into bloqueios (pessoa_id, inicio, fim) values (b, dia, dia);
  if pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: bloqueio deveria vencer o dia marcado'; end if;
  delete from bloqueios where pessoa_id = b;

  -- "Só nos dias que eu marcar": sem marca não pode, com marca pode
  delete from indisponibilidades where pessoa_id = b;
  insert into preferencias (pessoa_id, so_dias_marcados) values (b, true) on conflict (pessoa_id) do update set so_dias_marcados = true;
  if not pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: so_dias_marcados com dia marcado deveria poder'; end if;
  delete from dias_disponiveis where pessoa_id = b;
  if pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: so_dias_marcados sem marca deveria bloquear'; end if;

  -- Desligando a opção volta ao normal
  update preferencias set so_dias_marcados = false where pessoa_id = b;
  if not pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: desligar so_dias_marcados deveria liberar'; end if;

  delete from preferencias where pessoa_id = b;
  delete from eventos where id = ev;
  raise notice 'Disponibilidade com calendário: OK';
end $$;
