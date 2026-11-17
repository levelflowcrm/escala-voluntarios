-- Barra contas vazias: só e-mail cadastrado em `pessoas` pode criar conta de login.
do $$
declare ig uuid; p uuid;
begin
  select id into ig from igrejas where slug = 'nasci-pra-deus';
  insert into pessoas (igreja_id, nome, email) values (ig, 'Teste Conta', 'Teste.Conta@Exemplo.com') returning id into p;

  if not email_cadastrado('teste.conta@exemplo.com') then raise exception 'FALHOU: e-mail cadastrado deveria valer (minúsculas)'; end if;
  if not email_cadastrado('  TESTE.CONTA@EXEMPLO.COM ') then raise exception 'FALHOU: e-mail cadastrado deveria valer (maiúsculas e espaços)'; end if;
  if email_cadastrado('ninguem@exemplo.com') then raise exception 'FALHOU: e-mail desconhecido não deveria valer'; end if;
  if email_cadastrado(null) or email_cadastrado('') then raise exception 'FALHOU: e-mail vazio não deveria valer'; end if;

  -- O gatilho recusa quem não está cadastrado e deixa passar quem está (tabela temporária no lugar de auth.users)
  create temp table usuarios_teste (email text);
  create trigger barra before insert on usuarios_teste for each row execute function tg_barra_conta_sem_cadastro();
  begin
    insert into usuarios_teste values ('ninguem@exemplo.com');
    raise exception 'FALHOU: e-mail não cadastrado conseguiu criar conta';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'E-mail não cadastrado no Mais Conectados' then raise exception 'FALHOU: mensagem inesperada: %', sqlerrm; end if;
  end;
  insert into usuarios_teste values ('TESTE.CONTA@exemplo.com');
  if (select count(*) from usuarios_teste) <> 1 then raise exception 'FALHOU: e-mail cadastrado deveria criar conta'; end if;
  drop table usuarios_teste;

  if has_function_privilege('authenticated', 'email_cadastrado(text)', 'execute')
     or has_function_privilege('anon', 'email_cadastrado(text)', 'execute') then
    raise exception 'FALHOU: email_cadastrado não pode ser executável por anon/authenticated';
  end if;
  if has_function_privilege('authenticated', 'tg_barra_conta_sem_cadastro()', 'execute')
     or has_function_privilege('anon', 'tg_barra_conta_sem_cadastro()', 'execute') then
    raise exception 'FALHOU: gatilho não pode ser executável por anon/authenticated';
  end if;

  delete from pessoas where id = p;
  raise notice 'Contas vazias: OK';
end $$;
