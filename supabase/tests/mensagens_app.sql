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

-- Aviso por WhatsApp ao master (pela fila)
do $$
declare v uuid; m uuid; msg uuid; n int; txt text;
  uv uuid := gen_random_uuid(); um uuid := gen_random_uuid();
begin
  select id into v from pessoas where nome = 'Diogo';
  select id into m from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = uv where id = v;
  update pessoas set auth_user_id = um, celular = '(11) 95402-4089' where id = m;
  insert into administradores (pessoa_id, master) values (m, true) on conflict (pessoa_id) do update set master = true;
  delete from fila_whatsapp where tipo = 'mensagem_app';

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uv::text, true);
  insert into mensagens_app (autor_id, tipo, texto) values (v, 'sugestao', 'Colocar modo escuro') returning id into msg;
  -- mensagem do próprio master não gera aviso para ele
  perform set_config('request.jwt.claim.sub', um::text, true);
  insert into mensagens_app (autor_id, tipo, texto) values (m, 'erro', 'Teste do master');
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);

  select count(*), max(texto) into n, txt from fila_whatsapp where tipo = 'mensagem_app' and pessoa_id = m;
  if n <> 1 then raise exception 'FALHOU: master deveria ter 1 aviso na fila (%)', n; end if;
  if txt not like '%nova sugestão de Diogo%' or txt not like '%Colocar modo escuro%' or txt not like '%/mensagens%' then
    raise exception 'FALHOU: texto do aviso inesperado: %', txt;
  end if;

  -- sem celular válido: nada entra na fila
  delete from fila_whatsapp where tipo = 'mensagem_app';
  update pessoas set celular = null where id = m;
  insert into mensagens_app (igreja_id, autor_id, tipo, texto) select igreja_id, id, 'erro', 'Outro erro' from pessoas where id = v;
  select count(*) into n from fila_whatsapp where tipo = 'mensagem_app';
  if n <> 0 then raise exception 'FALHOU: enfileirou para master sem celular (%)', n; end if;

  delete from mensagens_app;
  delete from fila_whatsapp where tipo = 'mensagem_app';
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = m;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (v, m);
  raise notice 'Aviso WhatsApp do master: OK';
end $$;
