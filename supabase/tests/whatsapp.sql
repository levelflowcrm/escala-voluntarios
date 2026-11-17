-- Fila de WhatsApp: quem entra na fila, deduplicação, gatilhos (chegada, troca, publicação), lembrete de véspera e privilégios.
\set ON_ERROR_STOP 1

do $$
declare
  tm uuid; f uuid; ig uuid; ev uuid; ev_am uuid; ev_rasc uuid;
  a uuid; b uuid; coord uuid; sem_cel uuid;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  esc uuid; esc_am uuid; esc_rasc uuid; troca uuid; n int; txt text;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  select id into coord from pessoas where nome = 'Luciano';
  select id into sem_cel from pessoas where nome = 'Thamires';
  update pessoas set auth_user_id = ua, celular = '(11) 95402-4089' where id = a;
  update pessoas set auth_user_id = ub, celular = '11 98888-7777' where id = b;
  update pessoas set celular = '11 97777-6666' where id = coord;
  update pessoas set celular = null where id = sem_cel;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (a, tm, 'voluntario'), (b, tm, 'voluntario'), (coord, tm, 'coordenador'), (sem_cel, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  delete from fila_whatsapp;

  -- enfileirar: ignora sem celular, inativo e número curto; deduplica pela chave
  if enfileirar_whatsapp(sem_cel, 'teste', 'k1', 'oi') then raise exception 'FALHOU: enfileirou para quem não tem celular'; end if;
  update pessoas set celular = '123' where id = sem_cel;
  if enfileirar_whatsapp(sem_cel, 'teste', 'k1', 'oi') then raise exception 'FALHOU: enfileirou número curto'; end if;
  if not enfileirar_whatsapp(a, 'teste', 'k2', 'oi') then raise exception 'FALHOU: não enfileirou para celular válido'; end if;
  if enfileirar_whatsapp(a, 'teste', 'k2', 'oi') then raise exception 'FALHOU: duplicou a mesma chave'; end if;
  update pessoas set ativo = false where id = b;
  if enfileirar_whatsapp(b, 'teste', 'k3', 'oi') then raise exception 'FALHOU: enfileirou para pessoa inativa'; end if;
  update pessoas set ativo = true where id = b;
  delete from fila_whatsapp;

  -- Chegada: avisa o coordenador com celular (Luciano), não o sem celular (Valter) nem o próprio voluntário
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto zap', now() + interval '1 hour') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, false);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, a, 'pendente') returning id into esc;
  delete from fila_whatsapp; -- limpa o que o INSERT possa ter gerado
  update escalas_ministerio set publicada = true where evento_id = ev and ministerio_id = tm;
  select count(*) into n from fila_whatsapp where tipo = 'publicada' and pessoa_id = a;
  if n <> 1 then raise exception 'FALHOU: publicar deveria avisar a escalada (1), foi %', n; end if;
  -- publicar de novo na mesma hora não duplica
  update escalas_ministerio set publicada = false where evento_id = ev and ministerio_id = tm;
  update escalas_ministerio set publicada = true where evento_id = ev and ministerio_id = tm;
  select count(*) into n from fila_whatsapp where tipo = 'publicada' and pessoa_id = a;
  if n <> 1 then raise exception 'FALHOU: republicar na mesma hora duplicou o aviso (%)', n; end if;

  perform set_config('request.jwt.claim.sub', ua::text, true);
  perform registrar_chegada(esc, -23.465533, -46.5133597);
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from fila_whatsapp where tipo = 'chegada';
  if n <> 1 then raise exception 'FALHOU: chegada deveria avisar só 1 coordenador com celular, foi %', n; end if;
  if not exists (select 1 from fila_whatsapp where tipo = 'chegada' and pessoa_id = coord and texto like '%Sérgio%') then
    raise exception 'FALHOU: aviso de chegada não foi ao coordenador ou não cita o voluntário';
  end if;

  -- Troca: pedido avisa o colega; resposta avisa quem pediu
  perform set_config('request.jwt.claim.sub', ua::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  insert into trocas (escala_id, solicitante_id, colega_id) values (esc, a, b) returning id into troca;
  if not exists (select 1 from fila_whatsapp where tipo = 'troca' and pessoa_id = b and chave = 'troca:' || troca || ':pedido') then
    raise exception 'FALHOU: pedido de troca não avisou o colega';
  end if;
  update trocas set status = 'recusada', respondido_em = now() where id = troca;
  if not exists (select 1 from fila_whatsapp where tipo = 'troca' and pessoa_id = a and chave = 'troca:' || troca || ':recusada') then
    raise exception 'FALHOU: recusa de troca não avisou quem pediu';
  end if;
  update trocas set status = 'cancelada' where id = troca; -- cancelada não avisa ninguém
  select count(*) into n from fila_whatsapp where tipo = 'troca';
  if n <> 2 then raise exception 'FALHOU: esperava 2 avisos de troca, foram %', n; end if;

  -- Lembrete de véspera: publicado + amanhã entra; rascunho e recusada não
  insert into eventos (igreja_id, titulo, inicio)
    values (ig, 'Culto amanha', (((now() at time zone 'America/Sao_Paulo')::date + 1)::timestamp + time '19:30') at time zone 'America/Sao_Paulo') returning id into ev_am;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev_am, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev_am, tm, f, a, 'pendente') returning id into esc_am;
  insert into eventos (igreja_id, titulo, inicio)
    values (ig, 'Culto amanha rascunho', (((now() at time zone 'America/Sao_Paulo')::date + 1)::timestamp + time '20:30') at time zone 'America/Sao_Paulo') returning id into ev_rasc;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev_rasc, tm, false);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev_rasc, tm, f, b, 'confirmado') returning id into esc_rasc;
  delete from fila_whatsapp;
  n := enfileirar_lembretes();
  if n <> 1 then raise exception 'FALHOU: lembretes esperados 1 (só publicada), foram %', n; end if;
  select texto into txt from fila_whatsapp where tipo = 'lembrete' and pessoa_id = a;
  if txt is null or txt not like '%Culto amanha%' or txt not like '%confirmar%' then raise exception 'FALHOU: lembrete sem o culto ou sem pedir confirmação: %', txt; end if;
  if exists (select 1 from fila_whatsapp where tipo = 'lembrete' and pessoa_id = b) then raise exception 'FALHOU: lembrete de escala em rascunho'; end if;
  -- rodar de novo não duplica
  if enfileirar_lembretes() <> 0 then raise exception 'FALHOU: lembretes duplicados na segunda rodada'; end if;
  -- confirmada: o texto muda
  update escalas set status = 'confirmado' where id = esc_am;
  delete from fila_whatsapp;
  perform enfileirar_lembretes();
  select texto into txt from fila_whatsapp where tipo = 'lembrete' and pessoa_id = a;
  if txt like '%falta confirmar%' then raise exception 'FALHOU: pediu confirmação de quem já confirmou'; end if;

  -- boas-vindas: ao cadastrar o celular, uma mensagem só; trocar de número não repete
  delete from fila_whatsapp;
  update pessoas set celular = null, auth_user_id = null where id = sem_cel;
  update pessoas set celular = '11 96666-5555' where id = sem_cel;
  select texto into txt from fila_whatsapp where tipo = 'boas_vindas' and pessoa_id = sem_cel;
  if txt is null then raise exception 'FALHOU: não enviou boas-vindas ao cadastrar o celular'; end if;
  if txt not like '%entre com o Google%' then raise exception 'FALHOU: boas-vindas sem o passo a passo de acesso'; end if;
  update pessoas set celular = '11 95555-4444' where id = sem_cel;
  select count(*) into n from fila_whatsapp where tipo = 'boas_vindas' and pessoa_id = sem_cel;
  if n <> 1 then raise exception 'FALHOU: repetiu boas-vindas ao trocar o número (%)', n; end if;
  -- número inválido não gera mensagem
  delete from fila_whatsapp;
  update pessoas set celular = null where id = sem_cel;
  update pessoas set celular = '123' where id = sem_cel;
  select count(*) into n from fila_whatsapp where pessoa_id = sem_cel;
  if n <> 0 then raise exception 'FALHOU: boas-vindas para número inválido'; end if;

  -- limpeza: remove o que o teste criou
  delete from fila_whatsapp;
  delete from trocas where id = troca;
  delete from eventos where id in (ev, ev_am, ev_rasc);
  raise notice 'Fila de WhatsApp: OK';
end $$;

-- Privilégios: ninguém logado lê a fila nem chama as funções internas
do $$
declare fn text;
begin
  for fn in select unnest(array[
    'enfileirar_whatsapp(uuid,text,text,text)', 'enfileirar_lembretes()', 'rotulo_evento_whatsapp(uuid)', 'tg_whatsapp_boas_vindas()'
  ]) loop
    if has_function_privilege('authenticated', fn, 'execute') or has_function_privilege('anon', fn, 'execute') then
      raise exception 'FALHOU: % executável por authenticated/anon', fn;
    end if;
  end loop;
  if has_table_privilege('authenticated', 'fila_whatsapp', 'select') or has_table_privilege('anon', 'fila_whatsapp', 'select') then
    raise exception 'FALHOU: fila_whatsapp legível por authenticated/anon';
  end if;
end $$;
