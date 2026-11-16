-- Ocupações entre ministérios: só coordenador consulta; rascunho de outro ministério conta.
\set ON_ERROR_STOP 1
do $$
declare tm uuid; pj uuid; ig uuid; ev uuid; a uuid; c uuid; v uuid; n int;
  uc uuid := gen_random_uuid(); uv uuid := gen_random_uuid();
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into pj from ministerios where nome = 'Projeção';
  select id into a from pessoas where nome = 'Sérgio';
  select id into c from pessoas where nome = 'Thamires';
  select id into v from pessoas where nome = 'Diogo';
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uv where id = v;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, tm, 'coordenador'), (v, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto ocup', now() + interval '25 days') returning id into ev;
  -- Sérgio escalado em RASCUNHO na Projeção (a coordenadora da Transmissão não enxerga essa linha)
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, pj, false);
  insert into escalas (evento_id, ministerio_id, pessoa_id, papel, status) values (ev, pj, a, 'responsavel_dia', 'pendente');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  select count(*) into n from escalas where evento_id = ev;
  if n <> 0 then raise exception 'FALHOU: coordenadora enxergou rascunho de outro ministério (%)', n; end if;
  select count(*) into n from ocupacoes_do_periodo(now(), now() + interval '60 days') where evento_id = ev and pessoa_id = a;
  if n <> 1 then raise exception 'FALHOU: ocupação não apareceu (%)', n; end if;

  perform set_config('request.jwt.claim.sub', uv::text, true);
  select count(*) into n from ocupacoes_do_periodo(now(), now() + interval '60 days');
  if n <> 0 then raise exception 'FALHOU: voluntário consultou ocupações'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id = ev;
  update pessoas set auth_user_id = null where id in (c, v);
  raise notice 'Ocupações: OK';
end $$;
