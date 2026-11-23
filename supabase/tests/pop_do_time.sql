-- POP do time: só o facilitador edita; só o time (e admin) lê.
\set ON_ERROR_STOP 1
do $$
declare tm uuid; pj uuid; c uuid; v uuid; o uuid; n int;
  uc uuid := gen_random_uuid(); uv uuid := gen_random_uuid(); uo uuid := gen_random_uuid();
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into pj from ministerios where nome = 'Projeção';
  select id into c from pessoas where nome = 'Thamires';
  select id into v from pessoas where nome = 'Diogo';
  select id into o from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uv where id = v;
  update pessoas set auth_user_id = uo where id = o;
  delete from membros_ministerio where pessoa_id in (c, v, o);
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, tm, 'coordenador'), (v, tm, 'voluntario'), (o, pj, 'voluntario');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  perform salvar_pop(tm, '  1. Chegar cedo  ', 'https://drive.google.com/x');
  if (select conteudo from pop_ministerio where ministerio_id = tm) <> '1. Chegar cedo' then raise exception 'FALHOU: não salvou o POP'; end if;
  perform salvar_pop(tm, '1. Chegar cedo 2. Ligar tudo', '');
  if (select link from pop_ministerio where ministerio_id = tm) is not null then raise exception 'FALHOU: link vazio deveria ficar nulo'; end if;
  begin perform salvar_pop(tm, 'x', 'javascript:alert(1)'); raise exception 'FALHOU: aceitou link inválido';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform salvar_pop(pj, 'x', ''); raise exception 'FALHOU: facilitador editou POP de outro time';
  exception when insufficient_privilege then null; end;
  begin update pop_ministerio set conteudo = 'hack'; raise exception 'FALHOU: gravou direto na tabela';
  exception when insufficient_privilege then null; end;

  -- Voluntário do mesmo time lê, mas não edita
  perform set_config('request.jwt.claim.sub', uv::text, true);
  select count(*) into n from pop_ministerio where ministerio_id = tm;
  if n <> 1 then raise exception 'FALHOU: voluntário do time não lê o POP'; end if;
  begin perform salvar_pop(tm, 'x', ''); raise exception 'FALHOU: voluntário editou o POP';
  exception when insufficient_privilege then null; end;

  -- Voluntário de outro time não lê
  perform set_config('request.jwt.claim.sub', uo::text, true);
  select count(*) into n from pop_ministerio;
  if n <> 0 then raise exception 'FALHOU: outro time leu o POP (%)', n; end if;

  -- Salvar vazio remove
  perform set_config('request.jwt.claim.sub', uc::text, true);
  perform salvar_pop(tm, '   ', null);
  select count(*) into n from pop_ministerio where ministerio_id = tm;
  if n <> 0 then raise exception 'FALHOU: POP vazio não foi removido'; end if;

  reset role; set local role anon;
  begin perform count(*) from pop_ministerio; raise exception 'FALHOU: anon leu POP';
  exception when insufficient_privilege then null; end;
  raise notice 'POP do time: OK';
end $$;
