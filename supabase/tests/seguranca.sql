-- Testes de acesso como os usuários reais do Supabase (RLS ativa).
\set ON_ERROR_STOP 1

-- Prepara um voluntário logado (Josy) e uma pessoa de outra igreja
do $$
declare outra uuid := gen_random_uuid();
begin
  update pessoas set auth_user_id = '00000000-0000-0000-0000-00000000a001' where nome = 'Josy';
  insert into igrejas (id, nome, slug) values (outra, 'Outra igreja', 'outra');
  insert into pessoas (igreja_id, nome, auth_user_id) values (outra, 'Visitante', '00000000-0000-0000-0000-00000000b002');
end $$;

-- 1) Visitante anônimo não vê nada
set role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from escalas;
    if n > 0 then raise exception 'FALHOU: anônimo vê % escalas', n; end if;
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into n from carga_voluntarios;
    if n > 0 then raise exception 'FALHOU: anônimo vê a carga dos voluntários'; end if;
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into n from pessoas;
    if n > 0 then raise exception 'FALHOU: anônimo vê pessoas'; end if;
  exception when insufficient_privilege then null; end;
  raise notice 'Anônimo: sem acesso OK';
end $$;
reset role;

-- 2) Voluntário logado vê a própria igreja
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', false);
do $$
declare n int;
begin
  select count(*) into n from escalas;
  if n = 0 then raise exception 'FALHOU: voluntário não vê as escalas publicadas'; end if;
  select count(*) into n from pessoas;
  if n <> 33 then raise exception 'FALHOU: voluntário deveria ver 33 pessoas, viu %', n; end if;
  begin
    update escalas set status = 'recusado' where pessoa_id <> minha_pessoa();
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FALHOU: voluntário alterou escala de outra pessoa'; end if;
  end;
  raise notice 'Voluntário: acesso correto OK';
end $$;

-- 3) Pessoa de outra igreja não vê nada desta
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b002', false);
do $$
declare n int;
begin
  select count(*) into n from escalas;
  if n > 0 then raise exception 'FALHOU: outra igreja vê % escalas', n; end if;
  select count(*) into n from carga_voluntarios;
  if n > 1 then raise exception 'FALHOU: outra igreja vê a carga dos voluntários (%)', n; end if;
  select count(*) into n from pessoas;
  if n <> 1 then raise exception 'FALHOU: outra igreja vê % pessoas', n; end if;
  raise notice 'Outra igreja: isolada OK';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- Limpeza
update pessoas set auth_user_id = null where nome = 'Josy';
delete from igrejas where slug = 'outra';
