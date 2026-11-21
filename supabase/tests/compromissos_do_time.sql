-- Compromissos do time: só o facilitador do ministério cria/altera/cancela; só o time vê;
-- não entra no calendário oficial (tabela eventos).
\set ON_ERROR_STOP 1

do $$
declare tm uuid; pj uuid; coord uuid; vol uuid; outro uuid;
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into pj from ministerios where nome = 'Projeção';
  select id into coord from pessoas where nome = 'Sérgio';
  select id into vol from pessoas where nome = 'Diogo';
  select id into outro from pessoas where nome = 'Josy';
  update pessoas set auth_user_id = u1 where id = coord;
  update pessoas set auth_user_id = u2 where id = vol;
  update pessoas set auth_user_id = u3 where id = outro;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (vol, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'voluntario';
  -- Josy: facilitadora da Projeção, fora da Transmissão
  delete from membros_ministerio where pessoa_id = outro and ministerio_id = tm;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (outro, pj, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  perform set_config('test.coord', u1::text, false);
  perform set_config('test.vol', u2::text, false);
  perform set_config('test.outro', u3::text, false);
  perform set_config('test.tm', tm::text, false);
  perform set_config('test.coordid', coord::text, false);
  perform set_config('test.volid', vol::text, false);
  perform set_config('test.outroid', outro::text, false);
  perform set_config('test.eventos', (select count(*) from eventos)::text, false);
end $$;

set role authenticated;

-- 1) Facilitador da Transmissão marca um ensaio
select set_config('request.jwt.claim.sub', current_setting('test.coord'), false);
insert into compromissos_time (ministerio_id, tipo, inicio, local, criado_por)
values (current_setting('test.tm')::uuid, 'ensaio', now() + interval '5 days', 'Templo', current_setting('test.coordid')::uuid);
do $$
begin
  update compromissos_time set local = 'Sala 2';
  if not exists (select 1 from compromissos_time where local = 'Sala 2') then raise exception 'FALHOU: facilitador não alterou'; end if;
  begin
    insert into compromissos_time (ministerio_id, tipo, inicio, criado_por)
    values (current_setting('test.tm')::uuid, 'culto', now() + interval '1 day', current_setting('test.coordid')::uuid);
    raise exception 'FALHOU: aceitou tipo fora da lista';
  exception when check_violation then null; end;
  raise notice 'Compromissos: facilitador cria e altera OK';
end $$;

-- 2) Voluntário do time vê, mas não cria, não altera e não cancela
select set_config('request.jwt.claim.sub', current_setting('test.vol'), false);
do $$
declare n int;
begin
  if (select count(*) from compromissos_time) <> 1 then raise exception 'FALHOU: membro do time não vê o compromisso'; end if;
  begin
    insert into compromissos_time (ministerio_id, tipo, inicio, criado_por)
    values (current_setting('test.tm')::uuid, 'treinamento', now() + interval '2 days', current_setting('test.volid')::uuid);
    raise exception 'FALHOU: voluntário criou compromisso';
  exception when insufficient_privilege then null; end;
  update compromissos_time set local = 'mudei';
  delete from compromissos_time;
  select count(*) into n from compromissos_time where local = 'Sala 2';
  if n <> 1 then raise exception 'FALHOU: voluntário alterou ou cancelou'; end if;
  raise notice 'Compromissos: voluntário do time só vê OK';
end $$;

-- 3) Facilitadora de OUTRO ministério não vê nem mexe no compromisso da Transmissão
select set_config('request.jwt.claim.sub', current_setting('test.outro'), false);
do $$
begin
  if (select count(*) from compromissos_time) <> 0 then raise exception 'FALHOU: outro ministério vê o compromisso'; end if;
  begin
    insert into compromissos_time (ministerio_id, tipo, inicio, criado_por)
    values (current_setting('test.tm')::uuid, 'reuniao_online', now() + interval '2 days', current_setting('test.outroid')::uuid);
    raise exception 'FALHOU: facilitadora de outro ministério criou na Transmissão';
  exception when insufficient_privilege then null; end;
  raise notice 'Compromissos: outro ministério isolado OK';
end $$;

-- 4) Facilitador cancela; nada entrou no calendário oficial
select set_config('request.jwt.claim.sub', current_setting('test.coord'), false);
do $$
begin
  delete from compromissos_time;
  if (select count(*) from compromissos_time) <> 0 then raise exception 'FALHOU: facilitador não cancelou'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  if (select count(*) from eventos)::text <> current_setting('test.eventos') then
    raise exception 'FALHOU: compromisso do time entrou na tabela de eventos oficiais';
  end if;
  raise notice 'Compromissos: cancelamento e fora do calendário oficial OK';
end $$;

-- Limpeza
delete from compromissos_time;
delete from membros_ministerio where pessoa_id = (select id from pessoas where nome = 'Josy')
  and ministerio_id = (select id from ministerios where nome = 'Projeção') and papel = 'coordenador';
update pessoas set auth_user_id = null where nome in ('Sérgio', 'Diogo', 'Josy');
