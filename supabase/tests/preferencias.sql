-- Preferências: cada um edita só a sua; coordenador lê.
\set ON_ERROR_STOP 1
do $$
declare a uuid; b uuid; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); tm uuid; n int;
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  update pessoas set auth_user_id = ua where id = a;
  update pessoas set auth_user_id = ub where id = b;
  insert into membros_ministerio (pessoa_id, ministerio_id) values (a, tm), (b, tm) on conflict do nothing;
  -- b é só voluntário aqui
  update membros_ministerio set papel = 'voluntario' where pessoa_id in (a, b) and ministerio_id = tm;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ua::text, true);
  insert into preferencias (pessoa_id, limite_mensal, observacao) values (a, 2, 'domingos');
  begin insert into preferencias (pessoa_id, limite_mensal) values (b, 1); raise exception 'FALHOU: gravou preferência alheia';
  exception when insufficient_privilege or check_violation then null; end;
  begin insert into preferencias (pessoa_id, limite_mensal) values (a, 0); raise exception 'FALHOU: aceitou limite 0';
  exception when check_violation or unique_violation then null; end;

  perform set_config('request.jwt.claim.sub', ub::text, true);
  select count(*) into n from preferencias;
  if n <> 0 then raise exception 'FALHOU: voluntário leu preferência de outro (%)', n; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  delete from preferencias where pessoa_id in (a, b);
  update pessoas set auth_user_id = null where id in (a, b);
  raise notice 'Preferências: OK';
end $$;
