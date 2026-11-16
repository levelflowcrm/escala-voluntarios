-- Tela de permissões: só administrador lista e define coordenadores.
\set ON_ERROR_STOP 1
do $$
declare adm uuid; vol uuid; tm uuid; n int;
  uadm uuid := gen_random_uuid(); uvol uuid := gen_random_uuid();
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into adm from pessoas where nome = 'Sérgio';
  select id into vol from pessoas where nome = 'Diogo';
  update pessoas set auth_user_id = uadm where id = adm;
  update pessoas set auth_user_id = uvol where id = vol;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (vol, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'voluntario';
  insert into administradores (pessoa_id, master) values (adm, true);

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uvol::text, true);
  select count(*) into n from equipe_permissoes();
  if n <> 0 then raise exception 'FALHOU: voluntário listou permissões'; end if;
  begin perform definir_coordenador(vol, tm, true); raise exception 'FALHOU: voluntário se promoveu';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  perform set_config('request.jwt.claim.sub', uadm::text, true);
  select count(*) into n from equipe_permissoes();
  if n < 2 then raise exception 'FALHOU: admin não listou a equipe (%)', n; end if;
  perform definir_coordenador(vol, tm, true);
  perform set_config('request.jwt.claim.sub', uvol::text, true);
  if not sou_coordenador(tm) then raise exception 'FALHOU: não virou coordenador'; end if;
  perform set_config('request.jwt.claim.sub', uadm::text, true);
  perform definir_coordenador(vol, tm, false);
  perform set_config('request.jwt.claim.sub', uvol::text, true);
  if sou_coordenador(tm) then raise exception 'FALHOU: continuou coordenador'; end if;
  if not exists (select 1 from membros_ministerio where pessoa_id = vol and ministerio_id = tm) then
    raise exception 'FALHOU: saiu do time ao deixar de coordenar';
  end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = adm;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (adm, vol);
  raise notice 'Permissões: OK';
end $$;
