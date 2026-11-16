-- Comunicados: coordenador publica, voluntário do ministério lê, os demais não.
\set ON_ERROR_STOP 1

do $$
declare
  tm uuid; ig uuid; coord uuid; vol uuid; fora uuid; outra uuid := gen_random_uuid();
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid();
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into coord from pessoas where nome = 'Sérgio';
  select id into vol   from pessoas where nome = 'Diogo';
  select id into fora  from pessoas where nome = 'Josy';
  update pessoas set auth_user_id = u1 where id = coord;
  update pessoas set auth_user_id = u2 where id = vol;
  update pessoas set auth_user_id = u3 where id = fora;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (vol, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'voluntario';
  delete from membros_ministerio where pessoa_id = fora and ministerio_id = tm;
  insert into igrejas (id, nome, slug) values (outra, 'Outra', 'outra-com');
  insert into pessoas (igreja_id, nome, auth_user_id) values (outra, 'Estranho', u4);
  perform set_config('test.coord', u1::text, false);
  perform set_config('test.vol', u2::text, false);
  perform set_config('test.fora', u3::text, false);
  perform set_config('test.estranho', u4::text, false);
  perform set_config('test.tm', tm::text, false);
  perform set_config('test.coordid', coord::text, false);
  perform set_config('test.volid', vol::text, false);
end $$;

set role authenticated;

-- Coordenador publica
select set_config('request.jwt.claim.sub', current_setting('test.coord'), false);
insert into comunicados (ministerio_id, autor_id, titulo, texto)
  values (current_setting('test.tm')::uuid, current_setting('test.coordid')::uuid, 'Ensaio', 'Sábado às 15h');

-- Voluntário do ministério lê, mas não publica
select set_config('request.jwt.claim.sub', current_setting('test.vol'), false);
do $$
begin
  if (select count(*) from comunicados) <> 1 then raise exception 'FALHOU: voluntário do ministério não vê o comunicado'; end if;
  begin
    insert into comunicados (ministerio_id, autor_id, titulo, texto)
      values (current_setting('test.tm')::uuid, current_setting('test.volid')::uuid, 'X', 'Y');
    raise exception 'FALHOU: voluntário publicou comunicado';
  exception when insufficient_privilege then null; end;
  delete from comunicados;
  if (select count(*) from comunicados) <> 1 then raise exception 'FALHOU: voluntário apagou comunicado'; end if;
end $$;

-- Quem não é do ministério (mesma igreja) e quem é de outra igreja não veem
select set_config('request.jwt.claim.sub', current_setting('test.fora'), false);
do $$ begin
  if (select count(*) from comunicados) <> 0 then raise exception 'FALHOU: pessoa fora do ministério vê comunicado'; end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('test.estranho'), false);
do $$ begin
  if (select count(*) from comunicados) <> 0 then raise exception 'FALHOU: outra igreja vê comunicado'; end if;
end $$;

-- Anônimo não acessa
set role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from comunicados;
    if n > 0 then raise exception 'FALHOU: anônimo vê comunicados'; end if;
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  delete from comunicados;
  update pessoas set auth_user_id = null where nome in ('Sérgio', 'Diogo', 'Josy');
  delete from igrejas where slug = 'outra-com';
  raise notice 'Comunicados: OK';
end $$;
