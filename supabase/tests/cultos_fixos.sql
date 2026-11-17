-- Cultos fixos: só o master edita modelos e registra pausas; coordenador e voluntário só leem; ocorrência preenchida.
\set ON_ERROR_STOP 1
do $$
declare ig uuid; tm uuid; c uuid; v uuid; m uuid; tipo uuid; p uuid; n int; sem_ocorrencia int;
  uc uuid := gen_random_uuid(); uv uuid := gen_random_uuid(); um uuid := gen_random_uuid();
begin
  select id into ig from igrejas limit 1;
  select id into tm from ministerios where nome = 'Transmissão';
  select id into tipo from tipos_evento where nome = 'Encontro de Vida - Quarta';
  select id into c from pessoas where nome = 'Thamires';
  select id into v from pessoas where nome = 'Diogo';
  select id into m from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uv where id = v;
  update pessoas set auth_user_id = um where id = m;
  insert into administradores (pessoa_id, master) values (m, true) on conflict (pessoa_id) do update set master = true;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, tm, 'coordenador'), (v, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;

  -- o preenchimento da migração (dia do culto no fuso de São Paulo) cobre todos os cultos fixos
  update eventos set ocorrencia = (inicio at time zone 'America/Sao_Paulo')::date where tipo_evento_id is not null and ocorrencia is null;
  select count(*) into sem_ocorrencia from eventos where tipo_evento_id is not null and ocorrencia is null;
  if sem_ocorrencia <> 0 then raise exception 'FALHOU: % culto(s) fixo(s) sem ocorrência', sem_ocorrencia; end if;
  select count(*) into n from eventos where tipo_evento_id is not null
    and ocorrencia <> (inicio at time zone 'America/Sao_Paulo')::date;
  if n <> 0 then raise exception 'FALHOU: ocorrência diferente do dia do culto'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);

  -- coordenador NÃO edita culto fixo nem cria pausa
  update tipos_evento set hora = '05:00' where id = tipo;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: coordenador editou o culto fixo'; end if;
  begin insert into pausas_cultos (igreja_id, de, ate) values (ig, '2027-04-01', '2027-04-02'); raise exception 'FALHOU: coordenador criou pausa';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub', um::text, true);
  -- master muda dia/horário do modelo e registra pausa (de um tipo e geral)
  update tipos_evento set dia_semana = 4, hora = '20:00' where id = tipo;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: master não editou o culto fixo'; end if;
  insert into pausas_cultos (igreja_id, tipo_evento_id, de, ate, motivo) values (ig, tipo, '2027-01-04', '2027-01-04', 'teste') returning id into p;
  insert into pausas_cultos (igreja_id, tipo_evento_id, de, ate) values (ig, null, '2027-01-01', '2027-01-10');

  -- período invertido é recusado
  begin insert into pausas_cultos (igreja_id, de, ate) values (ig, '2027-02-10', '2027-02-01'); raise exception 'FALHOU: aceitou período invertido';
  exception when check_violation then null; end;

  -- voluntário lê, mas não cria nem remove
  perform set_config('request.jwt.claim.sub', uv::text, true);
  select count(*) into n from pausas_cultos;
  if n <> 2 then raise exception 'FALHOU: voluntário deveria enxergar as pausas (%)', n; end if;
  begin insert into pausas_cultos (igreja_id, de, ate) values (ig, '2027-03-01', '2027-03-02'); raise exception 'FALHOU: voluntário criou pausa';
  exception when insufficient_privilege then null; when others then if sqlerrm like 'FALHOU%' then raise; end if; end;
  delete from pausas_cultos where id = p;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: voluntário removeu pausa'; end if;
  update tipos_evento set hora = '06:00' where id = tipo;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: voluntário editou culto fixo'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = m;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (c, v, m);
  raise notice 'Cultos fixos e pausas: OK';
end $$;
