-- Métricas dos cultos: permissão, validações, gravação, contagem auto e isolamento.
\set ON_ERROR_STOP 1
do $$
declare
  ig uuid; lv uuid; fl uuid; ev uuid; ev_fut uuid; c uuid; k uuid; l uuid; adm uuid; a1 uuid; a2 uuid; n int; soma int; r record;
  ua uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); uk uuid := gen_random_uuid(); ul uuid := gen_random_uuid();
begin
  select id, igreja_id into lv, ig from ministerios where nome = 'Louvor';
  select id into c from pessoas where nome = 'Thamires';  -- facilitadora do Louvor
  select id into k from pessoas where nome = 'Marcos';    -- voluntário comum
  select id into l from pessoas where nome = 'Sérgio';    -- voluntário do Louvor, escalado
  select id into adm from pessoas where nome = 'Diogo';   -- administrador
  update pessoas set auth_user_id = ua where id = adm;
  insert into administradores (pessoa_id, master) values (adm, false) on conflict do nothing;
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uk where id = k;
  update pessoas set auth_user_id = ul where id = l;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, lv, 'coordenador'), (l, lv, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  delete from membros_ministerio where pessoa_id = k;
  delete from escalas where pessoa_id in (c, k, l, adm);
  select id into fl from funcoes where ministerio_id = lv limit 1;
  if fl is null then insert into funcoes (ministerio_id, nome) values (lv, 'Vocal metricas') returning id into fl; end if;
  select id into a1 from areas_contagem where igreja_id = ig and nome = 'Louvor';
  select id into a2 from areas_contagem where igreja_id = ig and nome = 'Cozinha';
  if a1 is null or a2 is null then raise exception 'FALHOU: áreas padrão não foram criadas'; end if;
  select count(*) into n from areas_contagem where igreja_id = ig;
  if n <> 9 then raise exception 'FALHOU: esperava 9 áreas, achei %', n; end if;
  if (select cadeiras_total from metricas_config where igreja_id = ig) <> 2055 then raise exception 'FALHOU: capacidade padrão'; end if;

  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto métricas', now() - interval '2 hours') returning id into ev;
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto futuro', now() + interval '3 days') returning id into ev_fut;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, lv, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status, chegou_em) values (ev, lv, fl, l, 'confirmado', now() - interval '90 minutes');

  -- Voluntário comum: não grava, não vê
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uk::text, true);
  begin perform salvar_metricas(ev, '{"online": 10}'); raise exception 'FALHOU: voluntário lançou métricas';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  if pode_ver_metricas() then raise exception 'FALHOU: voluntário vê painel'; end if;

  -- Voluntário do Louvor (não facilitador): também não
  perform set_config('request.jwt.claim.sub', ul::text, true);
  if pode_ver_metricas() then raise exception 'FALHOU: voluntário do Louvor vê painel'; end if;

  -- Facilitador (coordenador de ministério) também NÃO acessa: só administrador
  perform set_config('request.jwt.claim.sub', uc::text, true);
  if pode_ver_metricas() then raise exception 'FALHOU: facilitador acessou o painel'; end if;
  begin perform salvar_metricas(ev, '{"online": 10}'); raise exception 'FALHOU: facilitador lançou métricas';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- Administrador lança
  perform set_config('request.jwt.claim.sub', ua::text, true);
  if not pode_ver_metricas() then raise exception 'FALHOU: administrador não acessa'; end if;
  begin perform salvar_metricas(ev_fut, '{"online": 10}'); raise exception 'FALHOU: lançou em culto distante';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform salvar_metricas(ev, '{"nave_vazias": 1500, "galeria_vazias": 600}'); raise exception 'FALHOU: vazias acima de 2055';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform salvar_metricas(ev, '{"carros": -3}'); raise exception 'FALHOU: aceitou negativo';
  exception when check_violation then null; end;
  begin perform salvar_metricas(ev, jsonb_build_object('areas', jsonb_build_array(jsonb_build_object('area_id', gen_random_uuid(), 'qtd', 5)))); raise exception 'FALHOU: área inexistente';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  perform salvar_metricas(ev, jsonb_build_object('online', 320, 'visitantes', 18, 'sim_pra_jesus', 7, 'nave_vazias', 400, 'galeria_vazias', 155,
    'carros', 210, 'motos', 64, 'areas', jsonb_build_array(jsonb_build_object('area_id', a1, 'qtd', 12), jsonb_build_object('area_id', a2, 'qtd', 5))));
  select * into r from metricas_evento where evento_id = ev;
  if r.online <> 320 or r.cadeiras_nave_vazias <> 400 or r.motos <> 64 then raise exception 'FALHOU: ficha não gravou'; end if;
  select sum(qtd) into n from metricas_areas where evento_id = ev;
  if n <> 17 then raise exception 'FALHOU: áreas somam % (esperava 17)', n; end if;
  -- Regravar substitui (área removida some; campo em branco vira "não contado")
  perform salvar_metricas(ev, jsonb_build_object('online', 330, 'areas', jsonb_build_array(jsonb_build_object('area_id', a1, 'qtd', 13), jsonb_build_object('area_id', a2, 'qtd', ''))));
  select * into r from metricas_evento where evento_id = ev;
  if r.online <> 330 or r.visitantes is not null or r.cadeiras_nave_vazias is not null then raise exception 'FALHOU: regravação não limpou os campos em branco'; end if;
  select count(*), sum(qtd) into n, soma from metricas_areas where evento_id = ev;
  if n <> 1 or soma <> 13 then raise exception 'FALHOU: área em branco deveria sumir'; end if;

  -- Contagem auto: 1 escalado que apertou Cheguei
  select * into r from metricas_auto(now() - interval '1 day', now() + interval '1 day') where evento_id = ev;
  if r.escalados <> 1 or r.presentes <> 1 then raise exception 'FALHOU: contagem auto (% / %)', r.escalados, r.presentes; end if;

  -- Gravação direta é bloqueada (sem política de escrita)
  begin update metricas_evento set online = 1 where evento_id = ev; get diagnostics n = row_count;
    if n > 0 then raise exception 'FALHOU: update direto passou'; end if;
  exception when insufficient_privilege then null; end;

  -- Voluntário comum não enxerga as linhas
  perform set_config('request.jwt.claim.sub', uk::text, true);
  select count(*) into n from metricas_evento; if n <> 0 then raise exception 'FALHOU: voluntário viu métricas'; end if;
  select count(*) into n from metricas_auto(now() - interval '1 day', now() + interval '1 day'); if n <> 0 then raise exception 'FALHOU: voluntário viu contagem auto'; end if;
  reset role;

  delete from eventos where id in (ev, ev_fut);
  perform set_config('request.jwt.claim.sub', '', true);
  delete from administradores where pessoa_id = adm;
  update pessoas set auth_user_id = null where id in (c, k, l, adm);
  raise notice 'Métricas dos cultos: OK';
end $$;
