-- Dispensar evento: o coordenador dispensa só o PRÓPRIO ministério; não dá para escalar em evento dispensado;
-- com gente escalada o banco recusa; voluntário comum não dispensa; só o master cria o evento.
\set ON_ERROR_STOP 1
do $$
declare ig uuid; tm uuid; il uuid; f uuid; c uuid; v uuid; m uuid; ev uuid; n int;
  uc uuid := gen_random_uuid(); uv uuid := gen_random_uuid(); um uuid := gen_random_uuid();
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into il from ministerios where nome = 'Iluminação';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into c from pessoas where nome = 'Thamires';
  select id into v from pessoas where nome = 'Diogo';
  select id into m from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uv where id = v;
  update pessoas set auth_user_id = um where id = m;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, tm, 'coordenador'), (v, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  insert into administradores (pessoa_id, master) values (m, true) on conflict (pessoa_id) do update set master = true;

  set local role authenticated;

  -- só o master cria o evento
  perform set_config('request.jwt.claim.sub', um::text, true);
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Evento dispensa', now() + interval '30 days') returning id into ev;

  -- voluntário comum não dispensa
  perform set_config('request.jwt.claim.sub', uv::text, true);
  begin perform dispensar_evento(ev, tm, true); raise exception 'FALHOU: voluntário dispensou evento';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- coordenador da Transmissão dispensa a Transmissão, mas não a Iluminação
  perform set_config('request.jwt.claim.sub', uc::text, true);
  begin perform dispensar_evento(ev, il, true); raise exception 'FALHOU: coordenador dispensou outro ministério';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  perform dispensar_evento(ev, tm, true);
  perform dispensar_evento(ev, tm, true); -- repetir não dá erro
  select count(*) into n from eventos_dispensados where evento_id = ev and ministerio_id = tm;
  if n <> 1 then raise exception 'FALHOU: dispensa não registrada (%)', n; end if;

  -- evento dispensado não aceita escala desse ministério
  begin
    insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, v, 'pendente');
    raise exception 'FALHOU: escalou em evento dispensado';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- todos enxergam as dispensas; ninguém escreve direto na tabela
  perform set_config('request.jwt.claim.sub', uv::text, true);
  select count(*) into n from eventos_dispensados where evento_id = ev;
  if n <> 1 then raise exception 'FALHOU: voluntário não enxerga a dispensa'; end if;
  begin delete from eventos_dispensados where evento_id = ev; get diagnostics n = row_count; if n <> 0 then raise exception 'FALHOU: voluntário apagou dispensa'; end if;
  exception when insufficient_privilege then null; end;

  -- voltar a escalar; com gente escalada não dá para dispensar
  perform set_config('request.jwt.claim.sub', uc::text, true);
  perform dispensar_evento(ev, tm, false);
  select count(*) into n from eventos_dispensados where evento_id = ev;
  if n <> 0 then raise exception 'FALHOU: dispensa não foi desfeita'; end if;
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, v, 'pendente');
  begin perform dispensar_evento(ev, tm, true); raise exception 'FALHOU: dispensou com gente escalada';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- só tem recusa: dispensa limpa as linhas e passa
  update escalas set status = 'recusado' where evento_id = ev and ministerio_id = tm;
  perform dispensar_evento(ev, tm, true);
  select count(*) into n from escalas where evento_id = ev and ministerio_id = tm;
  if n <> 0 then raise exception 'FALHOU: recusas não foram limpas'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id = ev;
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = m;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (c, v, m);
  raise notice 'Dispensar evento: OK';
end $$;

-- Coordenador B enxerga que a pessoa já está escalada pelo coordenador A (e o banco barra a duplicidade)
do $$
declare ig uuid; tm uuid; il uuid; f uuid; fi uuid; c uuid; ci uuid; v uuid; m uuid; ev uuid; n int; nome_min text;
  uc uuid := gen_random_uuid(); ui uuid := gen_random_uuid(); um uuid := gen_random_uuid(); uv uuid := gen_random_uuid();
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into il from ministerios where nome = 'Iluminação';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into c from pessoas where nome = 'Thamires';
  select id into ci from pessoas where nome = 'Marcos';
  select id into v from pessoas where nome = 'Diogo';
  select id into m from pessoas where nome = 'Sérgio';
  insert into funcoes (ministerio_id, nome, ordem) values (il, 'Luz teste', 99) returning id into fi;
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = ui where id = ci;
  update pessoas set auth_user_id = um where id = m;
  update pessoas set auth_user_id = uv where id = v;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, tm, 'coordenador'), (ci, il, 'coordenador'), (v, tm, 'voluntario'), (v, il, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  insert into administradores (pessoa_id, master) values (m, true) on conflict (pessoa_id) do update set master = true;
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Evento duas áreas', now() + interval '31 days') returning id into ev;

  set local role authenticated;
  -- A (Transmissão) escala o Diogo em rascunho
  perform set_config('request.jwt.claim.sub', uc::text, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, v, 'pendente');

  -- B (Iluminação) vê que o Diogo já está na Transmissão
  perform set_config('request.jwt.claim.sub', ui::text, true);
  select ministerio into nome_min from escalados_no_periodo(now(), now() + interval '60 days') where evento_id = ev and pessoa_id = v;
  if nome_min is distinct from 'Transmissão' then raise exception 'FALHOU: B não vê que o Diogo está na Transmissão (%)', nome_min; end if;

  -- e o banco barra a duplicidade se B tentar escalar o mesmo voluntário
  begin
    insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, il, fi, v, 'pendente');
    raise exception 'FALHOU: escalou o mesmo voluntário em dois ministérios no mesmo evento';
  exception when unique_violation then null; end;

  -- voluntário comum não enxerga essa lista
  perform set_config('request.jwt.claim.sub', uv::text, true);
  select count(*) into n from escalados_no_periodo(now(), now() + interval '60 days');
  if n <> 0 then raise exception 'FALHOU: voluntário comum enxergou escalas de outros ministérios (%)', n; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id = ev;
  delete from funcoes where id = fi;
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = m;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (c, ci, v, m);
  raise notice 'Escalados em outro ministério: OK';
end $$;
