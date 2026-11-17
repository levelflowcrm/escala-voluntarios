-- Administrador master, poder de coordenador e eventos só do master.
\set ON_ERROR_STOP 1
do $$
declare
  adm uuid; vol uuid; coord uuid; ig uuid; tm uuid; ev uuid;
  uadm uuid := gen_random_uuid(); uvol uuid := gen_random_uuid(); ucoord uuid := gen_random_uuid();
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into adm from pessoas where nome = 'Sérgio';
  select id into vol from pessoas where nome = 'Diogo';
  select id into coord from pessoas where nome = 'Thamires';
  update pessoas set auth_user_id = uadm where id = adm;
  update pessoas set auth_user_id = uvol where id = vol;
  update pessoas set auth_user_id = ucoord where id = coord;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (adm, tm, 'voluntario'), (vol, tm, 'voluntario'), (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  insert into administradores (pessoa_id, master) values (adm, true);

  -- master não pode ser removido nem rebaixado (nem pelo servidor)
  begin delete from administradores where pessoa_id = adm; raise exception 'FALHOU: removeu o master';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin update administradores set master = false where pessoa_id = adm; raise exception 'FALHOU: rebaixou o master';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  set local role authenticated;

  -- administrador é coordenador de tudo; voluntário comum, não
  perform set_config('request.jwt.claim.sub', uadm::text, true);
  if not sou_coordenador_algum() or not sou_coordenador(tm) then raise exception 'FALHOU: admin não vale como coordenador'; end if;
  perform set_config('request.jwt.claim.sub', uvol::text, true);
  if sou_coordenador_algum() or sou_admin() then raise exception 'FALHOU: voluntário com poder indevido'; end if;

  -- coordenador NÃO cria evento (nem de agenda, nem de escala): só o master
  perform set_config('request.jwt.claim.sub', ucoord::text, true);
  begin
    insert into eventos (igreja_id, titulo, inicio, so_agenda) values (ig, 'Conferência', now() + interval '20 days', true);
    raise exception 'FALHOU: coordenador criou evento de agenda';
  exception when insufficient_privilege then null; end;
  begin
    insert into eventos (igreja_id, titulo, inicio) values (ig, 'Ensaio extra', now() + interval '21 days');
    raise exception 'FALHOU: coordenador criou evento de escala';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub', uadm::text, true);
  insert into eventos (igreja_id, titulo, inicio, fim, so_agenda, local, tipo_agenda)
    values (ig, 'Conferência', now() + interval '20 days', now() + interval '21 days', true, 'Templo', 'conferencia') returning id into ev;
  perform set_config('request.jwt.claim.sub', uvol::text, true);
  if not exists (select 1 from eventos where id = ev) then raise exception 'FALHOU: voluntário não vê a agenda'; end if;
  begin
    update eventos set titulo = 'Invadido' where id = ev;
    if found then raise exception 'FALHOU: voluntário editou agenda'; end if;
  end;
  begin perform definir_admin(vol, true); raise exception 'FALHOU: voluntário promoveu alguém';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- master promove e remove outro administrador, sem conseguir remover a si
  perform set_config('request.jwt.claim.sub', uadm::text, true);
  perform definir_admin(coord, true);
  perform set_config('request.jwt.claim.sub', ucoord::text, true);
  if not sou_admin() then raise exception 'FALHOU: não promoveu'; end if;
  perform set_config('request.jwt.claim.sub', uadm::text, true);
  perform definir_admin(coord, false);
  perform definir_admin(adm, false);
  if not sou_admin_master() then raise exception 'FALHOU: master foi removido'; end if;
  perform set_config('request.jwt.claim.sub', ucoord::text, true);
  if sou_admin() then raise exception 'FALHOU: não removeu o admin'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id = ev;
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id in (adm, vol, coord);
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (adm, vol, coord);
  raise notice 'Administrador e agenda: OK';
end $$;
