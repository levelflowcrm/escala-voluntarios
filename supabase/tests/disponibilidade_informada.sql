-- "Já informei minha disponibilidade": só do próprio usuário, mês atual e próximo.
\set ON_ERROR_STOP 1
do $$
declare a uuid; b uuid; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); n int;
  m0 date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
begin
  select id into a from pessoas where nome = 'Thamires';
  select id into b from pessoas where nome = 'Diogo';
  update pessoas set auth_user_id = ua where id = a;
  update pessoas set auth_user_id = ub where id = b;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ua::text, true);
  select count(*) into n from disponibilidade_informada;
  if n <> 0 then raise exception 'FALHOU: já começou informado (%)', n; end if;
  perform informar_disponibilidade();
  perform informar_disponibilidade();  -- repetir não duplica
  select count(*) into n from disponibilidade_informada where mes in (m0, (m0 + interval '1 month')::date);
  if n <> 2 then raise exception 'FALHOU: esperava mês atual e próximo (%)', n; end if;

  begin insert into disponibilidade_informada (pessoa_id, mes) values (a, m0); raise exception 'FALHOU: gravou direto';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub', ub::text, true);
  select count(*) into n from disponibilidade_informada;
  if n <> 0 then raise exception 'FALHOU: enxergou o de outra pessoa (%)', n; end if;

  reset role; set local role anon;
  begin perform informar_disponibilidade(); raise exception 'FALHOU: anon marcou';
  exception when insufficient_privilege then null; end;
  raise notice 'Disponibilidade informada: OK';
end $$;
