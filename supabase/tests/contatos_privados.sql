-- Contatos privados: só a própria pessoa e o coordenador leem e-mail/celular/aniversário.
\set ON_ERROR_STOP 1

do $$
declare tm uuid; coord uuid; vol uuid; outro uuid;
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into coord from pessoas where nome = 'Sérgio';
  select id into vol from pessoas where nome = 'Diogo';
  select id into outro from pessoas where nome = 'Josy';
  update pessoas set auth_user_id = u1 where id = coord;
  update pessoas set auth_user_id = u2 where id = vol;
  update pessoas set email = 'josy@exemplo.com', celular = '11999990000', aniversario = '1992-03-04' where id = outro;
  update pessoas set celular = '11988887777' where id = vol;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (vol, tm, 'voluntario'), (outro, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'voluntario';
  perform set_config('test.coord', u1::text, false);
  perform set_config('test.vol', u2::text, false);
end $$;

set role authenticated;

-- Voluntário: lê nomes, não lê contato dos outros, lê os próprios dados, não recebe dados do time
select set_config('request.jwt.claim.sub', current_setting('test.vol'), false);
do $$
declare n int;
begin
  select count(*) into n from pessoas where nome = 'Josy';
  if n <> 1 then raise exception 'FALHOU: voluntário não vê o nome dos colegas'; end if;
  begin
    perform email from pessoas;
    raise exception 'FALHOU: voluntário leu e-mail de colegas';
  exception when insufficient_privilege then null; end;
  begin
    perform celular from pessoas;
    raise exception 'FALHOU: voluntário leu celular de colegas';
  exception when insufficient_privilege then null; end;
  begin
    perform aniversario from pessoas;
    raise exception 'FALHOU: voluntário leu aniversário de colegas';
  exception when insufficient_privilege then null; end;
  begin
    perform auth_user_id from pessoas;
    raise exception 'FALHOU: voluntário leu o vínculo de login de colegas';
  exception when insufficient_privilege then null; end;
  if (select celular from meus_dados()) <> '11988887777' then raise exception 'FALHOU: meus_dados não devolve o próprio celular'; end if;
  if (select count(*) from dados_do_time()) <> 0 then raise exception 'FALHOU: voluntário recebeu dados do time'; end if;
  -- continua editando o próprio contato
  update pessoas set celular = '11977776666' where id = minha_pessoa();
end $$;

-- Coordenador: recebe o contato do time
select set_config('request.jwt.claim.sub', current_setting('test.coord'), false);
do $$
begin
  if not exists (select 1 from dados_do_time() where nome = 'Josy' and email = 'josy@exemplo.com' and aniversario = '1992-03-04') then
    raise exception 'FALHOU: coordenador não recebeu o contato do time';
  end if;
end $$;

set role anon;
do $$ begin
  begin perform * from meus_dados(); raise exception 'FALHOU: anônimo chamou meus_dados';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  update pessoas set auth_user_id = null where nome in ('Sérgio', 'Diogo');
  update pessoas set email = null, celular = null, aniversario = null where nome in ('Josy', 'Diogo');
  raise notice 'Contatos privados: OK';
end $$;
