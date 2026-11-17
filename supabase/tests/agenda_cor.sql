-- Agenda: tipo 'locacao' e cor pastel válidas; valores fora da lista são recusados.
\set ON_ERROR_STOP 1
do $$
declare ig uuid; n int;
begin
  select id into ig from igrejas limit 1;
  insert into eventos (igreja_id, titulo, inicio, so_agenda, tipo_agenda, cor)
  values (ig, 'Locação teste', now() + interval '10 days', true, 'locacao', 'pessego');
  insert into eventos (igreja_id, titulo, inicio, so_agenda, tipo_agenda)
  values (ig, 'Sem cor', now() + interval '11 days', true, 'ensaio');
  select count(*) into n from eventos where titulo = 'Sem cor' and cor is null;
  if n <> 1 then raise exception 'FALHOU: cor deveria ser opcional'; end if;
  begin
    insert into eventos (igreja_id, titulo, inicio, so_agenda, tipo_agenda, cor)
    values (ig, 'Cor errada', now() + interval '12 days', true, 'ensaio', 'vermelho');
    raise exception 'FALHOU: aceitou cor fora da paleta';
  exception when check_violation then null; end;
  begin
    insert into eventos (igreja_id, titulo, inicio, so_agenda, tipo_agenda)
    values (ig, 'Tipo errado', now() + interval '13 days', true, 'festa');
    raise exception 'FALHOU: aceitou tipo desconhecido';
  exception when check_violation then null; end;
  raise notice 'Agenda cor/locação: OK';
end $$;

-- Cor de culto de escala: só o master altera; coordenador e voluntário comum não.
do $$
declare ig uuid; tm uuid; c uuid; v uuid; m uuid; ev uuid; n int; cor_atual text;
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
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto cor teste', now() + interval '20 days') returning id into ev;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  update eventos set cor = 'rosa' where id = ev;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: coordenador alterou a cor do culto'; end if;

  perform set_config('request.jwt.claim.sub', um::text, true);
  update eventos set cor = 'menta' where id = ev;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: master não conseguiu colorir o culto'; end if;

  perform set_config('request.jwt.claim.sub', uv::text, true);
  update eventos set cor = 'rosa' where id = ev and not so_agenda;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: voluntário alterou a cor do culto'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = m;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (c, v, m);
  select cor into cor_atual from eventos where id = ev;
  if cor_atual <> 'menta' then raise exception 'FALHOU: cor final inesperada (%)', cor_atual; end if;
  raise notice 'Cor de cultos de escala: OK';
end $$;
