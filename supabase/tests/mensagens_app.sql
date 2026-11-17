-- Fale com o app: qualquer pessoa envia como si mesma; só o autor e o master leem; só o master acompanha e apaga.
\set ON_ERROR_STOP 1
do $$
declare ig uuid; v uuid; o uuid; m uuid; msg uuid; n int;
  uv uuid := gen_random_uuid(); uo uuid := gen_random_uuid(); um uuid := gen_random_uuid();
begin
  select id into v from pessoas where nome = 'Diogo';
  select id into o from pessoas where nome = 'Thamires';
  select id, igreja_id into m, ig from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = uv where id = v;
  update pessoas set auth_user_id = uo where id = o;
  update pessoas set auth_user_id = um where id = m;
  insert into administradores (pessoa_id, master) values (m, true) on conflict (pessoa_id) do update set master = true;

  set local role authenticated;

  -- o voluntário envia um erro como ele mesmo
  perform set_config('request.jwt.claim.sub', uv::text, true);
  insert into mensagens_app (autor_id, tipo, texto, pagina) values (v, 'erro', 'O botão não abre', '/montar') returning id into msg;

  -- não dá para enviar em nome de outra pessoa, nem já como "resolvida", nem vazio, nem tipo inventado
  begin insert into mensagens_app (autor_id, tipo, texto) values (o, 'erro', 'Em nome de outro'); raise exception 'FALHOU: enviou em nome de outra pessoa';
  exception when insufficient_privilege then null; end;
  begin insert into mensagens_app (autor_id, tipo, texto, status) values (v, 'erro', 'Já resolvida', 'resolvida'); raise exception 'FALHOU: enviou já resolvida';
  exception when insufficient_privilege then null; end;
  begin insert into mensagens_app (autor_id, tipo, texto) values (v, 'erro', '   '); raise exception 'FALHOU: enviou texto vazio';
  exception when check_violation then null; end;
  begin insert into mensagens_app (autor_id, tipo, texto) values (v, 'xpto', 'Tipo inventado'); raise exception 'FALHOU: tipo inventado';
  exception when check_violation then null; end;

  -- o autor vê a própria mensagem, mas não consegue mudar o status nem apagar
  select count(*) into n from mensagens_app;
  if n <> 1 then raise exception 'FALHOU: autor deveria ver 1 mensagem (%)', n; end if;
  update mensagens_app set status = 'resolvida' where id = msg;
  if (select status from mensagens_app where id = msg) <> 'nova' then raise exception 'FALHOU: autor mudou o status'; end if;
  delete from mensagens_app where id = msg;
  select count(*) into n from mensagens_app;
  if n <> 1 then raise exception 'FALHOU: autor apagou a mensagem'; end if;

  -- outra pessoa não vê
  perform set_config('request.jwt.claim.sub', uo::text, true);
  select count(*) into n from mensagens_app;
  if n <> 0 then raise exception 'FALHOU: outra pessoa viu mensagem alheia (%)', n; end if;

  -- o master vê tudo e acompanha
  perform set_config('request.jwt.claim.sub', um::text, true);
  select count(*) into n from mensagens_app;
  if n <> 1 then raise exception 'FALHOU: master deveria ver a mensagem (%)', n; end if;
  update mensagens_app set status = 'vista' where id = msg;
  if (select status from mensagens_app where id = msg) <> 'vista' then raise exception 'FALHOU: master não mudou o status'; end if;
  delete from mensagens_app where id = msg;
  select count(*) into n from mensagens_app;
  if n <> 0 then raise exception 'FALHOU: master não apagou'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = m;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (v, o, m);
  raise notice 'Mensagens do app: OK';
end $$;
