-- Sugestões: voluntário envia (identificado ou anônimo), coordenador lê e acompanha, outros não veem.
\set ON_ERROR_STOP 1

do $$
declare tm uuid; coord uuid; vol uuid; fora uuid;
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into coord from pessoas where nome = 'Sérgio';
  select id into vol from pessoas where nome = 'Diogo';
  select id into fora from pessoas where nome = 'Josy';
  update pessoas set auth_user_id = u1 where id = coord;
  update pessoas set auth_user_id = u2 where id = vol;
  update pessoas set auth_user_id = u3 where id = fora;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (vol, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'voluntario';
  delete from membros_ministerio where pessoa_id = fora and ministerio_id = tm;
  perform set_config('test.coord', u1::text, false);
  perform set_config('test.vol', u2::text, false);
  perform set_config('test.fora', u3::text, false);
  perform set_config('test.tm', tm::text, false);
  perform set_config('test.volid', vol::text, false);
  perform set_config('test.foraid', fora::text, false);
end $$;

set role authenticated;

-- Voluntário envia uma identificada e uma anônima
select set_config('request.jwt.claim.sub', current_setting('test.vol'), false);
insert into sugestoes (ministerio_id, autor_id, texto) values (current_setting('test.tm')::uuid, current_setting('test.volid')::uuid, 'Mais um ensaio');
insert into sugestoes (ministerio_id, anonima, texto) values (current_setting('test.tm')::uuid, true, 'Ajustar o horário');
do $$
begin
  -- não pode se passar por outra pessoa, nem marcar anônima com autor
  begin
    insert into sugestoes (ministerio_id, autor_id, texto) values (current_setting('test.tm')::uuid, current_setting('test.foraid')::uuid, 'X');
    raise exception 'FALHOU: enviou como outra pessoa';
  exception when insufficient_privilege then null; end;
  begin
    insert into sugestoes (ministerio_id, autor_id, anonima, texto) values (current_setting('test.tm')::uuid, current_setting('test.volid')::uuid, true, 'X');
    raise exception 'FALHOU: anônima com autor';
  exception when insufficient_privilege or check_violation then null; end;
  -- o voluntário vê só a própria identificada (a anônima não tem autor)
  if (select count(*) from sugestoes) <> 1 then raise exception 'FALHOU: voluntário deveria ver 1 sugestão'; end if;
  -- não muda status
  update sugestoes set status = 'aplicada';
  if exists (select 1 from sugestoes where status <> 'nova') then raise exception 'FALHOU: voluntário mudou status'; end if;
end $$;

-- Coordenador vê as 2, sem autor na anônima, e acompanha
select set_config('request.jwt.claim.sub', current_setting('test.coord'), false);
do $$
begin
  if (select count(*) from sugestoes) <> 2 then raise exception 'FALHOU: coordenador deveria ver 2'; end if;
  if (select count(*) from sugestoes where anonima and autor_id is not null) <> 0 then raise exception 'FALHOU: anônima revela autor'; end if;
  update sugestoes set status = 'vista';
  if exists (select 1 from sugestoes where status <> 'vista') then raise exception 'FALHOU: coordenador não conseguiu marcar como vista'; end if;
end $$;

-- Quem não é do ministério não vê nem envia
select set_config('request.jwt.claim.sub', current_setting('test.fora'), false);
do $$
begin
  if (select count(*) from sugestoes) <> 0 then raise exception 'FALHOU: pessoa fora do ministério vê sugestões'; end if;
  begin
    insert into sugestoes (ministerio_id, autor_id, texto) values (current_setting('test.tm')::uuid, current_setting('test.foraid')::uuid, 'X');
    raise exception 'FALHOU: pessoa fora do ministério enviou';
  exception when insufficient_privilege then null; end;
end $$;

set role anon;
do $$ declare n int; begin
  begin select count(*) into n from sugestoes; if n > 0 then raise exception 'FALHOU: anônimo vê sugestões'; end if;
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  delete from sugestoes;
  update pessoas set auth_user_id = null where nome in ('Sérgio', 'Diogo', 'Josy');
  raise notice 'Sugestões: OK';
end $$;
