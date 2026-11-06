-- Testes das regras de negócio. Cada bloco espera um erro específico.
\set ON_ERROR_STOP 1

do $$
declare
  ev uuid; tm uuid; f_dtv uuid; f_black uuid; f_luz uuid; ilu uuid;
  a uuid; b uuid; c uuid;
begin
  select id into tm  from ministerios where nome = 'Transmissão';
  select id into ilu from ministerios where nome = 'Iluminação';
  select id into f_dtv   from funcoes where nome = 'DTV-Transmissão';
  select id into f_black from funcoes where nome = 'Câmera Black';
  insert into funcoes (ministerio_id, nome) values (ilu, 'Mesa de luz') returning id into f_luz;
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  select id into c from pessoas where nome = 'Thamires';

  insert into eventos (igreja_id, titulo, inicio)
    select igreja_id, 'Teste', '2026-12-06 18:30-03' from ministerios where id = tm
    returning id into ev;

  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id) values (ev, tm, f_dtv, a);

  -- 1) Dois titulares na mesma função
  begin
    insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id) values (ev, tm, f_dtv, b);
    raise exception 'FALHOU: aceitou 2 titulares na mesma função';
  exception when unique_violation then null; end;

  -- 2) Mesma pessoa em duas funções do mesmo evento
  begin
    insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id) values (ev, tm, f_black, a);
    raise exception 'FALHOU: aceitou a mesma pessoa em 2 funções';
  exception when unique_violation then null; end;

  -- 3) Mesma pessoa em dois ministérios no mesmo evento
  begin
    insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id) values (ev, ilu, f_luz, a);
    raise exception 'FALHOU: aceitou a mesma pessoa em 2 ministérios';
  exception when unique_violation then null; end;

  -- 4) Função de outro ministério
  begin
    insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id) values (ev, tm, f_luz, b);
    raise exception 'FALHOU: aceitou função de outro ministério';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- 5) Responsável do dia com titulares já escalados
  begin
    insert into escalas (evento_id, ministerio_id, pessoa_id, papel) values (ev, tm, b, 'responsavel_dia');
    raise exception 'FALHOU: aceitou responsável do dia junto com titulares';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- 6) Apoio na mesma função é permitido (treinamento / dia intenso)
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, papel) values (ev, tm, f_dtv, b, 'apoio');

  -- 7) Quem recusou libera a vaga para outra pessoa
  update escalas set status = 'recusado' where evento_id = ev and pessoa_id = a;
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id) values (ev, tm, f_dtv, c);

  delete from eventos where id = ev;
  delete from funcoes where id = f_luz;
  raise notice 'Regras de escala: 7/7 OK';
end $$;

-- Segurança: voluntário só responde a própria escala
do $$
declare p uuid; u uuid := gen_random_uuid(); outra uuid;
begin
  select id into p from pessoas where nome = 'Josy';
  update pessoas set auth_user_id = u where id = p;
  perform set_config('request.jwt.claim.sub', u::text, true);

  select id into outra from escalas where pessoa_id <> p limit 1;

  -- (confirmar a própria escala é testado em seguranca.sql, com evento futuro)
  begin
    perform responder_escala(outra, 'recusado');
    raise exception 'FALHOU: respondeu escala de outra pessoa';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  update pessoas set auth_user_id = null where id = p;
  raise notice 'Resposta de escala: OK';
end $$;

-- Conferência dos números importados
select
  (select count(*) from pessoas)  as pessoas,
  (select count(*) from eventos)  as eventos,
  (select count(*) from escalas)  as escalas,
  (select count(*) from escalas where papel = 'responsavel_dia') as responsaveis_dia,
  (select count(*) from escalas where papel in ('apoio','treinamento')) as apoios;
