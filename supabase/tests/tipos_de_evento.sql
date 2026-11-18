-- Tipos de evento: master cria/renomeia/colore; coordenador e voluntário só leem; nome único; evento acompanha o renome.
\set ON_ERROR_STOP 1
do $$
declare ig uuid; tm uuid; c uuid; v uuid; m uuid; t uuid; ev uuid; n int; nome_atual text;
  uc uuid := gen_random_uuid(); uv uuid := gen_random_uuid(); um uuid := gen_random_uuid();
begin
  select id into ig from igrejas limit 1;
  select id into tm from ministerios where nome = 'Transmissão';
  select id into c from pessoas where nome = 'Thamires';
  select id into v from pessoas where nome = 'Diogo';
  select id into m from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uv where id = v;
  update pessoas set auth_user_id = um where id = m;
  insert into administradores (pessoa_id, master) values (m, true) on conflict (pessoa_id) do update set master = true;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, tm, 'coordenador'), (v, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;

  -- tipos pedidos pelo master existem e a cor padrão de Locação veio
  select count(*) into n from tipos_evento where igreja_id = ig and nome in ('Conferência','Ensaio','Reunião','Ação social','Outro','Encontro de Vida','Reunião com o Pr. Nei');
  if n <> 7 then raise exception 'FALHOU: faltam tipos básicos (achou %)', n; end if;
  select count(*) into n from tipos_evento where nome = 'Locação (evento extra)' and cor = 'pessego';
  if n <> 1 then raise exception 'FALHOU: Locação sem pêssego padrão'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', um::text, true);
  insert into tipos_evento (igreja_id, nome, cor) values (ig, 'Tipo teste', 'azul') returning id into t;
  begin insert into tipos_evento (igreja_id, nome) values (ig, 'Tipo teste'); raise exception 'FALHOU: aceitou nome repetido';
  exception when unique_violation then null; end;
  begin update tipos_evento set cor = 'vermelho' where id = t; raise exception 'FALHOU: aceitou cor fora da paleta';
  exception when check_violation then null; end;
  insert into eventos (igreja_id, titulo, inicio, tipo_evento_id, so_agenda) values (ig, 'Evento do tipo teste', now() + interval '30 days', t, true) returning id into ev;
  update tipos_evento set nome = 'Tipo renomeado' where id = t;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: master não renomeou'; end if;

  perform set_config('request.jwt.claim.sub', uc::text, true);
  update tipos_evento set nome = 'Coord mexeu' where id = t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: coordenador renomeou tipo'; end if;
  begin insert into tipos_evento (igreja_id, nome) values (ig, 'Coord criou'); raise exception 'FALHOU: coordenador criou tipo';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub', uv::text, true);
  select count(*) into n from tipos_evento where id = t;
  if n <> 1 then raise exception 'FALHOU: voluntário não enxerga os tipos'; end if;
  update tipos_evento set ativo = false where id = t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: voluntário desativou tipo'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  select t2.nome into nome_atual from eventos e join tipos_evento t2 on t2.id = e.tipo_evento_id where e.id = ev;
  if nome_atual <> 'Tipo renomeado' then raise exception 'FALHOU: evento não acompanhou o renome (%)', nome_atual; end if;
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = m;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (c, v, m);
  raise notice 'Tipos de evento: OK';
end $$;
