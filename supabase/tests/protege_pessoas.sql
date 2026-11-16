-- Voluntário só edita celular/aniversário/nome completo; coordenador edita tudo.
\set ON_ERROR_STOP 1

do $$
declare vol uuid; coord uuid; u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); tm uuid;
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into vol from pessoas where nome = 'Josy';
  select id into coord from pessoas where nome = 'Sérgio';
  update pessoas set auth_user_id = u1 where id = vol;
  update pessoas set auth_user_id = u2 where id = coord;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  delete from membros_ministerio where pessoa_id = vol and papel = 'coordenador';
  perform set_config('test.vol', u1::text, false);
  perform set_config('test.coord', u2::text, false);
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.vol'), false);
do $$
begin
  update pessoas set celular = '11999998888', aniversario = '1990-05-10', nome_completo = 'Josy Teste' where id = minha_pessoa();
  begin
    update pessoas set email = 'outro@x.com' where id = minha_pessoa();
    raise exception 'FALHOU: voluntário alterou o próprio e-mail';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin
    update pessoas set igreja_id = gen_random_uuid() where id = minha_pessoa();
    raise exception 'FALHOU: voluntário trocou de igreja';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if;
            when foreign_key_violation then null; end;
  begin
    update pessoas set ativo = false where id = minha_pessoa();
    raise exception 'FALHOU: voluntário se desativou';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin
    update pessoas set auth_user_id = gen_random_uuid() where id = minha_pessoa();
    raise exception 'FALHOU: voluntário trocou o vínculo de login';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub', current_setting('test.coord'), false);
do $$
begin
  update pessoas set email = 'josy@teste.com' where nome = 'Josy';
  if not exists (select 1 from pessoas where nome = 'Josy' and email = 'josy@teste.com') then
    raise exception 'FALHOU: coordenador não conseguiu editar o e-mail';
  end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  update pessoas set auth_user_id = null, email = null where nome in ('Josy', 'Sérgio');
  raise notice 'Proteção de pessoas: OK';
end $$;
