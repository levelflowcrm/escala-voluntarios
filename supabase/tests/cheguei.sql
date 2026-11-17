-- "Cheguei": janela de horário, dono da escala, publicação e visão do coordenador.
\set ON_ERROR_STOP 1

do $$
declare
  tm uuid; f uuid; f2 uuid; ig uuid; ev uuid; ev_longe uuid; ev_rasc uuid;
  a uuid; b uuid; coord uuid;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  esc uuid; esc_longe uuid; esc_rasc uuid; t1 timestamptz; t2 timestamptz; n int;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into f2 from funcoes where nome = 'Câmera Grua';
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  select id into coord from pessoas where nome = 'Luciano';
  update pessoas set auth_user_id = ua where id = a;
  update pessoas set auth_user_id = ub where id = b;
  update pessoas set auth_user_id = uc where id = coord;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (a, tm, 'voluntario'), (b, tm, 'voluntario'), (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;

  -- Culto daqui a 1 hora (dentro da janela), publicado; A titular pendente
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto cheguei', now() + interval '1 hour') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, a, 'pendente') returning id into esc;
  -- Culto daqui a 2 dias (fora da janela)
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto longe', now() + interval '2 days') returning id into ev_longe;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev_longe, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev_longe, tm, f, a, 'confirmado') returning id into esc_longe;
  -- Culto em rascunho, daqui a 1 hora
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto rascunho', now() + interval '1 hour') returning id into ev_rasc;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev_rasc, tm, false);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev_rasc, tm, f2, a, 'confirmado') returning id into esc_rasc;

  -- Outra pessoa não registra a chegada de A
  perform set_config('request.jwt.claim.sub', ub::text, true);
  begin
    perform registrar_chegada(esc, -23.465533, -46.5133597);
    raise exception 'FALHOU: outra pessoa registrou a chegada de A';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- A: fora da janela e em rascunho não pode
  perform set_config('request.jwt.claim.sub', ua::text, true);
  begin
    perform registrar_chegada(esc_longe, -23.465533, -46.5133597);
    raise exception 'FALHOU: chegou com o evento a 2 dias';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin
    perform registrar_chegada(esc_rasc, -23.465533, -46.5133597);
    raise exception 'FALHOU: chegou em escala não publicada';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- A: dentro da janela funciona e confirma a escala pendente
  t1 := registrar_chegada(esc, -23.465533, -46.5133597);
  if not exists (select 1 from escalas where id = esc and chegou_em = t1 and status = 'confirmado' and respondido_em is not null) then
    raise exception 'FALHOU: chegada não gravou ou não confirmou a escala';
  end if;
  -- Repetir não muda o horário
  perform pg_sleep(0.05);
  t2 := registrar_chegada(esc, -23.465533, -46.5133597);
  if t2 <> t1 then raise exception 'FALHOU: segunda chamada mudou o horário da chegada'; end if;

  -- Escala recusada não permite chegada
  update escalas set status = 'recusado', chegou_em = null where id = esc_longe;
  begin
    perform registrar_chegada(esc_longe, -23.465533, -46.5133597);
    raise exception 'FALHOU: chegou em escala recusada';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- Coordenador vê A como "já chegou"; voluntário B não vê nada
  perform set_config('request.jwt.claim.sub', uc::text, true);
  select count(*) into n from chegadas_do_dia() where pessoa_id = a and chegou_em = t1 and evento = 'Culto cheguei';
  if n <> 1 then raise exception 'FALHOU: coordenador não vê a chegada (%).', n; end if;
  select count(*) into n from chegadas_do_dia() where evento in ('Culto longe', 'Culto rascunho');
  if n <> 0 then raise exception 'FALHOU: lista do dia trouxe evento fora da janela ou rascunho (%).', n; end if;
  perform set_config('request.jwt.claim.sub', ub::text, true);
  select count(*) into n from chegadas_do_dia();
  if n <> 0 then raise exception 'FALHOU: voluntário comum enxerga a lista de chegadas'; end if;

  -- Limpeza
  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id in (ev, ev_longe, ev_rasc);
  update pessoas set auth_user_id = null where id in (a, b, coord);
  raise notice 'Cheguei: OK';
end $$;

-- Pela API, o voluntário não consegue gravar chegou_em direto (sem política de UPDATE)
do $$
declare ig uuid; tm uuid; f uuid; a uuid; ev uuid; ua uuid := gen_random_uuid(); esc uuid;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into a from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = ua where id = a;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (a, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'voluntario';
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto direto', now() + interval '1 hour') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, a, 'pendente') returning id into esc;
  perform set_config('test.ua', ua::text, false);
  perform set_config('test.esc', esc::text, false);
  perform set_config('test.ev', ev::text, false);
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.ua'), false);
do $$
declare n int;
begin
  update escalas set chegou_em = now() where id = current_setting('test.esc')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: voluntário gravou chegou_em direto pela API'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  delete from eventos where id = current_setting('test.ev')::uuid;
  update pessoas set auth_user_id = null where auth_user_id = current_setting('test.ua')::uuid;
  raise notice 'Cheguei (API direta): OK';
end $$;

-- Localização: o "Cheguei" só vale perto da igreja (coordenadas não são guardadas)
do $$
declare
  ig uuid; tm uuid; f uuid; a uuid; ev uuid; esc uuid; ua uuid := gen_random_uuid();
  lat0 double precision; lng0 double precision;
  t timestamptz;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select latitude, longitude into lat0, lng0 from igrejas where id = ig;
  if lat0 is null then raise exception 'FALHOU: igreja do seed sem coordenadas'; end if;
  if to_regprocedure('registrar_chegada(uuid)') is not null then raise exception 'FALHOU: versão antiga sem localização ainda existe'; end if;

  select id into f from funcoes where nome = 'Câmera Black';
  select id into a from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = ua where id = a;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (a, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'voluntario';
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto local', now() + interval '1 hour') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, a, 'pendente') returning id into esc;
  perform set_config('request.jwt.claim.sub', ua::text, true);

  -- longe (centro de São Paulo)
  begin
    perform registrar_chegada(esc, -23.5505, -46.6333);
    raise exception 'FALHOU: chegou estando longe da igreja';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  -- sem posição
  begin
    perform registrar_chegada(esc, null, null);
    raise exception 'FALHOU: chegou sem enviar a localização';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  -- posição impossível
  begin
    perform registrar_chegada(esc, 200, 0);
    raise exception 'FALHOU: aceitou latitude inválida';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  -- ~300 m sem folga de precisão: fora do raio de 250 m
  begin
    perform registrar_chegada(esc, lat0 + 0.0027, lng0);
    raise exception 'FALHOU: aceitou ~300 m (raio 250 m)';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  -- ~500 m mesmo com precisão ruim (folga máx. 150 m): continua fora
  begin
    perform registrar_chegada(esc, lat0 + 0.0045, lng0, 500);
    raise exception 'FALHOU: aceitou ~500 m com precisão ruim';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  if exists (select 1 from escalas where id = esc and chegou_em is not null) then raise exception 'FALHOU: chegada gravada mesmo recusada'; end if;

  -- ~100 m: dentro
  t := registrar_chegada(esc, lat0 + 0.0009, lng0);
  if not exists (select 1 from escalas where id = esc and chegou_em = t) then raise exception 'FALHOU: ~100 m não registrou'; end if;
  -- ~350 m com precisão 150: dentro pela folga
  update escalas set chegou_em = null where id = esc;
  t := registrar_chegada(esc, lat0 + 0.0031, lng0, 150);
  if not exists (select 1 from escalas where id = esc and chegou_em = t) then raise exception 'FALHOU: folga de precisão não funcionou'; end if;

  -- igreja sem coordenadas: checagem dispensada
  update escalas set chegou_em = null where id = esc;
  update igrejas set latitude = null, longitude = null where id = ig;
  t := registrar_chegada(esc, null, null);
  if not exists (select 1 from escalas where id = esc and chegou_em = t) then raise exception 'FALHOU: igreja sem coordenadas deveria dispensar a checagem'; end if;
  update igrejas set latitude = lat0, longitude = lng0 where id = ig;

  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id = ev;
  update pessoas set auth_user_id = null where id = a;
  raise notice 'Cheguei com localização: OK';
end $$;
