-- Sininho: cada pessoa só enxerga e altera a própria marca de leitura.
\set ON_ERROR_STOP 1

do $$
declare a uuid; b uuid; u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
begin
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  update pessoas set auth_user_id = u1 where id = a;
  update pessoas set auth_user_id = u2 where id = b;
  perform set_config('test.a', u1::text, false);
  perform set_config('test.b', u2::text, false);
  perform set_config('test.aid', a::text, false);
  perform set_config('test.bid', b::text, false);
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.a'), false);
insert into leituras_comunicados (pessoa_id, visto_em) values (current_setting('test.aid')::uuid, now())
  on conflict (pessoa_id) do update set visto_em = excluded.visto_em;

select set_config('request.jwt.claim.sub', current_setting('test.b'), false);
do $$
begin
  if (select count(*) from leituras_comunicados) <> 0 then raise exception 'FALHOU: vê a leitura de outra pessoa'; end if;
  begin
    insert into leituras_comunicados (pessoa_id) values (current_setting('test.aid')::uuid);
    raise exception 'FALHOU: gravou leitura em nome de outra pessoa';
  exception when insufficient_privilege or unique_violation then null; end;
  insert into leituras_comunicados (pessoa_id) values (current_setting('test.bid')::uuid);
  update leituras_comunicados set visto_em = now();
end $$;

set role anon;
do $$ declare n int; begin
  begin select count(*) into n from leituras_comunicados; if n > 0 then raise exception 'FALHOU: anônimo vê leituras'; end if;
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  delete from leituras_comunicados;
  update pessoas set auth_user_id = null where nome in ('Sérgio', 'Diogo');
  raise notice 'Leitura de comunicados: OK';
end $$;
