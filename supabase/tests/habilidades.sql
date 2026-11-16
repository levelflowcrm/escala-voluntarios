-- Habilidades: só coordenador da área (ou admin) define quem serve em qual função.
\set ON_ERROR_STOP 1
do $$
declare tm uuid; pj uuid; f1 uuid; f2 uuid; c uuid; v uuid; ad uuid; n int;
  uc uuid := gen_random_uuid(); uv uuid := gen_random_uuid(); uad uuid := gen_random_uuid();
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into pj from ministerios where nome = 'Projeção';
  select id into f1 from funcoes where nome = 'Câmera Black';
  insert into funcoes (ministerio_id, nome, ordem) values (pj, 'Operador teste', 99) returning id into f2;
  select id into c from pessoas where nome = 'Thamires';
  select id into v from pessoas where nome = 'Diogo';
  select id into ad from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uv where id = v;
  update pessoas set auth_user_id = uad where id = ad;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, tm, 'coordenador'), (v, tm, 'voluntario'), (ad, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  delete from habilitacoes where pessoa_id = v and funcao_id in (f1, f2);
  insert into administradores (pessoa_id, master) values (ad, true);

  set local role authenticated;
  -- coordenador da Transmissão define habilidade na própria área
  perform set_config('request.jwt.claim.sub', uc::text, true);
  insert into habilitacoes (pessoa_id, funcao_id, nivel) values (v, f1, 'apto');
  -- mas não na Projeção
  begin insert into habilitacoes (pessoa_id, funcao_id, nivel) values (v, f2, 'apto'); raise exception 'FALHOU: coordenador definiu habilidade em outra área';
  exception when insufficient_privilege then null; end;
  insert into membros_ministerio (pessoa_id, ministerio_id) values (v, tm) on conflict do nothing;

  -- voluntário não define a própria
  perform set_config('request.jwt.claim.sub', uv::text, true);
  begin insert into habilitacoes (pessoa_id, funcao_id, nivel) values (v, f1, 'apto') on conflict (pessoa_id, funcao_id) do update set nivel = 'apto';
    update habilitacoes set nivel = 'aprendiz' where pessoa_id = v and funcao_id = f1;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FALHOU: voluntário alterou a própria habilidade'; end if;
  exception when insufficient_privilege then null; end;

  -- administrador define em qualquer área (mais de uma área para a mesma pessoa)
  perform set_config('request.jwt.claim.sub', uad::text, true);
  insert into membros_ministerio (pessoa_id, ministerio_id) values (v, pj) on conflict do nothing;
  insert into habilitacoes (pessoa_id, funcao_id, nivel) values (v, f2, 'aprendiz');
  select count(*) into n from habilitacoes where pessoa_id = v and funcao_id in (f1, f2);
  if n <> 2 then raise exception 'FALHOU: pessoa deveria ter 2 áreas, tem %', n; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  delete from habilitacoes where pessoa_id = v and funcao_id in (f1, f2);
  delete from funcoes where id = f2;
  alter table administradores disable trigger administradores_master;
  delete from administradores where pessoa_id = ad;
  alter table administradores enable trigger administradores_master;
  update pessoas set auth_user_id = null where id in (c, v, ad);
  raise notice 'Habilidades: OK';
end $$;
