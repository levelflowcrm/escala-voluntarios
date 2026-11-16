-- Adicionar voluntário: só coordenador da área (ou admin); reaproveita e-mail existente.
\set ON_ERROR_STOP 1
do $$
declare tm uuid; pj uuid; f1 uuid; f2 uuid; c uuid; v uuid; novo uuid; novo2 uuid; ja boolean; n int;
  uc uuid := gen_random_uuid(); uv uuid := gen_random_uuid();
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into pj from ministerios where nome = 'Projeção';
  select id into f1 from funcoes where nome = 'Câmera Black';
  insert into funcoes (ministerio_id, nome, ordem) values (pj, 'Operador teste 2', 98) returning id into f2;
  select id into c from pessoas where nome = 'Thamires';
  select id into v from pessoas where nome = 'Diogo';
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uv where id = v;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, tm, 'coordenador'), (v, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);

  -- coordenador cadastra: pessoa, vínculo ao ministério e função (só da própria área)
  select pessoa_id, ja_existia into novo, ja from adicionar_voluntario('  Maria Teste  ', 'Maria.Teste@Exemplo.com', '11 99999-0000', tm, array[f1, f2]);
  if ja then raise exception 'FALHOU: pessoa nova marcada como existente'; end if;
  if not exists (select 1 from pessoas where id = novo and nome = 'Maria Teste' and ativo) then raise exception 'FALHOU: pessoa não criada com nome limpo'; end if;
  if not exists (select 1 from membros_ministerio where pessoa_id = novo and ministerio_id = tm and papel = 'voluntario') then raise exception 'FALHOU: não entrou no time'; end if;
  if not exists (select 1 from habilitacoes where pessoa_id = novo and funcao_id = f1 and nivel = 'apto') then raise exception 'FALHOU: função não marcada'; end if;
  if exists (select 1 from habilitacoes where pessoa_id = novo and funcao_id = f2) then raise exception 'FALHOU: função de outra área foi marcada'; end if;

  -- e-mail igual (maiúsculas diferentes) reaproveita a pessoa, sem duplicar
  select pessoa_id, ja_existia into novo2, ja from adicionar_voluntario('Outro Nome', 'maria.teste@exemplo.com', null, tm);
  if novo2 <> novo or not ja then raise exception 'FALHOU: não reaproveitou a pessoa pelo e-mail'; end if;

  -- nome repetido sem e-mail correspondente é recusado
  begin perform adicionar_voluntario('maria teste', null, null, tm); raise exception 'FALHOU: aceitou nome repetido';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  -- e-mail inválido e nome vazio
  begin perform adicionar_voluntario('Fulano', 'sem-arroba', null, tm); raise exception 'FALHOU: aceitou e-mail inválido';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform adicionar_voluntario(' ', null, null, tm); raise exception 'FALHOU: aceitou nome vazio';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- coordenador da Transmissão não cadastra na Projeção
  begin perform adicionar_voluntario('Alguém', null, null, pj); raise exception 'FALHOU: coordenou outra área';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- voluntário comum não cadastra
  perform set_config('request.jwt.claim.sub', uv::text, true);
  begin perform adicionar_voluntario('Intruso', null, null, tm); raise exception 'FALHOU: voluntário cadastrou';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- anônimo não executa
  reset role; set local role anon;
  begin perform adicionar_voluntario('Anon', null, null, tm); raise exception 'FALHOU: anon executou';
  exception when insufficient_privilege then null; end;
  raise notice 'Adicionar voluntário: OK';
end $$;
