-- Aviso do repertório: rascunho (invisível, sem aviso), notificar agora, programar (7h30 do dia) e destinatários.
\set ON_ERROR_STOP 1
do $$
declare
  ig uuid; lv uuid; pj uuid; fh uuid; fl uuid; ev uuid; ev_hoje uuid; c uuid; d uuid; k uuid; l uuid; n int; txt text; t1 timestamptz; t2 timestamptz;
  uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid(); uk uuid := gen_random_uuid(); ul uuid := gen_random_uuid();
  json1 jsonb := '[{"bloco":"abertura","titulo":"M1"},{"bloco":"abertura","titulo":"M2"},{"bloco":"abertura","titulo":"M3"},{"bloco":"encerramento","titulo":"Fim"}]';
  json2 jsonb := '[{"bloco":"abertura","titulo":"M1"},{"bloco":"abertura","titulo":"M2"},{"bloco":"abertura","titulo":"M4"},{"bloco":"encerramento","titulo":"Fim"}]';
begin
  select id, igreja_id into lv, ig from ministerios where nome = 'Louvor';
  select id into pj from ministerios where nome = 'Projeção';
  select id into fh from funcoes where nome = 'Holyrics';
  select id into c from pessoas where nome = 'Thamires';  -- facilitadora do Louvor
  select id into d from pessoas where nome = 'Diogo';     -- Projeção escalado
  select id into k from pessoas where nome = 'Marcos';    -- sem relação
  select id into l from pessoas where nome = 'Sérgio';    -- equipe de Louvor escalada
  update pessoas set auth_user_id = uc, celular = '(11) 95402-4091' where id = c;
  update pessoas set auth_user_id = ud, celular = '(11) 95402-4092' where id = d;
  update pessoas set auth_user_id = uk, celular = '(11) 95402-4093' where id = k;
  update pessoas set auth_user_id = ul, celular = '(11) 95402-4094' where id = l;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, lv, 'coordenador'), (l, lv, 'voluntario'), (d, pj, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  delete from membros_ministerio where pessoa_id = k and ministerio_id in (lv, pj);
  delete from repertorio_musicas; delete from repertorios; delete from fila_whatsapp;
  insert into funcoes (ministerio_id, nome) values (lv, 'Vocal teste') returning id into fl;

  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto avisos', date_trunc('day', now()) + interval '40 days' + interval '22 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, pj, true), (ev, lv, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, pj, fh, d, 'pendente'), (ev, lv, fl, l, 'confirmado');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  -- Modo inválido
  begin perform salvar_repertorio(ev, json1, 'xyz'); raise exception 'FALHOU: aceitou modo inválido';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  -- Rascunho: grava, sem aviso
  perform salvar_repertorio(ev, json1, 'rascunho');
  select count(*) into n from repertorios where evento_id = ev and not publicado;
  if n <> 1 then raise exception 'FALHOU: rascunho não ficou como não publicado'; end if;
  -- Facilitador vê o rascunho; Projeção e Louvor (equipe) não
  select count(*) into n from repertorio_musicas where evento_id = ev;
  if n <> 4 then raise exception 'FALHOU: facilitador deveria ver o rascunho (viu %)', n; end if;
  perform set_config('request.jwt.claim.sub', ud::text, true);
  select count(*) into n from repertorios where evento_id = ev;
  if n <> 0 then raise exception 'FALHOU: Projeção viu rascunho'; end if;
  select count(*) into n from repertorio_musicas where evento_id = ev;
  if n <> 0 then raise exception 'FALHOU: Projeção viu as músicas do rascunho'; end if;
  reset role;
  if exists (select 1 from fila_whatsapp where tipo = 'repertorio') then raise exception 'FALHOU: rascunho avisou alguém'; end if;

  -- Programar para o dia do culto (40 dias à frente): sem aviso agora, invisível até lá
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  perform salvar_repertorio(ev, json1, 'programar');
  if (select programado_para from repertorios where evento_id = ev) <> (select (inicio at time zone 'America/Sao_Paulo')::date from eventos where id = ev) then
    raise exception 'FALHOU: programação não ficou no dia do culto';
  end if;
  reset role;
  if exists (select 1 from fila_whatsapp where tipo = 'repertorio') then raise exception 'FALHOU: programar avisou na hora'; end if;
  -- Hoje não é o dia: a rotina das 7h30 não envia nada
  select enviar_repertorios_programados() into n;
  if n <> 0 then raise exception 'FALHOU: rotina enviou antes do dia (%)', n; end if;
  -- Chegou o dia (simulado): publica e avisa Louvor escalado e Projeção escalada, nunca quem salvou nem estranhos
  update repertorios set programado_para = (now() at time zone 'America/Sao_Paulo')::date where evento_id = ev;
  select enviar_repertorios_programados() into n;
  if n <> 1 then raise exception 'FALHOU: rotina deveria enviar 1 repertório (%)', n; end if;
  if not exists (select 1 from repertorios where evento_id = ev and publicado and programado_para is null) then raise exception 'FALHOU: não publicou'; end if;
  select count(*) into n from fila_whatsapp where tipo = 'repertorio' and pessoa_id in (d, l);
  if n <> 2 then raise exception 'FALHOU: deveria avisar Projeção e Louvor escalados (%)', n; end if;
  if exists (select 1 from fila_whatsapp where tipo = 'repertorio' and pessoa_id in (c, k)) then raise exception 'FALHOU: avisou quem salvou ou estranho'; end if;
  select texto into txt from fila_whatsapp where tipo = 'repertorio' and pessoa_id = d;
  if txt not like '%Repertório do louvor%' or txt like '%atualizado%' or txt not like '%1. M1%' or txt not like '%Encerramento: Fim%' then raise exception 'FALHOU: texto do 1º aviso (%)', txt; end if;
  select enviar_repertorios_programados() into n;
  if n <> 0 then raise exception 'FALHOU: reenviou o programado'; end if;
  -- Projeção agora vê
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ud::text, true);
  select count(*) into n from repertorio_musicas where evento_id = ev;
  if n <> 4 then raise exception 'FALHOU: Projeção deveria ver o publicado (%)', n; end if;
  -- Voluntário não chama a rotina
  begin perform enviar_repertorios_programados(); raise exception 'FALHOU: voluntário chamou a rotina';
  exception when insufficient_privilege then null; end;

  -- Depois de publicado: só "agora" (nada de rascunho/programar), e muda → avisa como atualização
  perform set_config('request.jwt.claim.sub', uc::text, true);
  begin perform salvar_repertorio(ev, json2, 'rascunho'); raise exception 'FALHOU: voltou publicado para rascunho';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform salvar_repertorio(ev, json2, 'programar'); raise exception 'FALHOU: programou algo já publicado';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  select atualizado_em into t1 from repertorios where evento_id = ev;
  perform salvar_repertorio(ev, json1, 'agora');   -- igual: silencioso
  reset role;
  select count(*) into n from fila_whatsapp where tipo = 'repertorio';
  if n <> 2 then raise exception 'FALHOU: salvar igual avisou de novo (%)', n; end if;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  t2 := salvar_repertorio(ev, json2, 'agora');      -- mudou M3 -> M4
  if t2 <= t1 then raise exception 'FALHOU: horário não avançou'; end if;
  reset role;
  select count(*) into n from fila_whatsapp where tipo = 'repertorio';
  if n <> 4 then raise exception 'FALHOU: atualização deveria avisar Projeção e Louvor (%)', n; end if;
  select texto into txt from fila_whatsapp where tipo = 'repertorio' and pessoa_id = d and texto like '%M4%';
  if txt is null or txt not like '%foi atualizado%' then raise exception 'FALHOU: texto da atualização (%)', txt; end if;

  -- Quem recusou a escala do Louvor não recebe
  update escalas set status = 'recusado' where evento_id = ev and pessoa_id = l;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  perform salvar_repertorio(ev, json1, 'agora');
  reset role;
  if (select count(*) from fila_whatsapp where tipo = 'repertorio' and pessoa_id = l) <> 2 then raise exception 'FALHOU: avisou quem recusou a escala'; end if;

  perform set_config('request.jwt.claim.sub', '', true);
  update pessoas set auth_user_id = null where id in (c, d, k, l);
  raise notice 'Avisos do repertório: OK';
end $$;
