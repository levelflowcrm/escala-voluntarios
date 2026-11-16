-- Vagas abertas: quem pode assumir uma vaga recusada.
\set ON_ERROR_STOP 1

do $$
declare
  tm uuid; f uuid; ig uuid; ev uuid; recusa uuid;
  a uuid; b uuid; c uuid; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  n int; novo uuid;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  select id into c from pessoas where nome = 'Thamires';
  update pessoas set auth_user_id = ua where id = a;
  update pessoas set auth_user_id = ub where id = b;
  update pessoas set auth_user_id = uc where id = c;
  insert into membros_ministerio (pessoa_id, ministerio_id) values (a, tm), (b, tm), (c, tm) on conflict do nothing;
  insert into habilitacoes (pessoa_id, funcao_id, nivel) values (a, f, 'apto'), (b, f, 'apto'), (c, f, 'aprendiz')
    on conflict (pessoa_id, funcao_id) do update set nivel = excluded.nivel;

  -- Evento futuro (domingo 19h, horário de Brasília), escala publicada, A titular
  insert into eventos (igreja_id, titulo, inicio)
    values (ig, 'Culto vagas', date_trunc('day', now()) + interval '30 days' + interval '22 hours')
    returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, a, 'pendente');

  -- Com a vaga ocupada, ninguém pode assumir
  if pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: assumiu vaga ocupada'; end if;

  -- A recusa libera a vaga
  update escalas set status = 'recusado', respondido_em = now() where evento_id = ev and pessoa_id = a returning id into recusa;
  if not pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: apto não pode assumir vaga livre'; end if;
  if pode_assumir_vaga(a, ev, f) then raise exception 'FALHOU: quem recusou pôde reassumir'; end if;
  if pode_assumir_vaga(c, ev, f) then raise exception 'FALHOU: aprendiz pôde assumir'; end if;

  -- Bloqueio no dia impede
  insert into bloqueios (pessoa_id, inicio, fim) values (b, (now() + interval '29 days')::date, (now() + interval '31 days')::date);
  if pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: assumiu com bloqueio'; end if;
  delete from bloqueios where pessoa_id = b;

  -- Indisponibilidade fixa no turno impede (noite do dia da semana do evento)
  insert into indisponibilidades (pessoa_id, dia_semana, periodo)
    select b, extract(dow from inicio at time zone 'America/Sao_Paulo')::int, 'noite' from eventos where id = ev;
  if pode_assumir_vaga(b, ev, f) then raise exception 'FALHOU: assumiu em turno indisponível'; end if;
  delete from indisponibilidades where pessoa_id = b;

  -- Assumir como usuário logado
  perform set_config('request.jwt.claim.sub', ub::text, true);
  select count(*) into n from vagas_abertas() where evento_id = ev;
  if n <> 1 then raise exception 'FALHOU: mural deveria ter 1 vaga, tem %', n; end if;
  novo := assumir_vaga(ev, f);
  if not exists (select 1 from escalas where id = novo and status = 'confirmado' and pessoa_id = b) then
    raise exception 'FALHOU: vaga não ficou confirmada';
  end if;

  -- Depois de assumida, some do mural e ninguém assume de novo
  select count(*) into n from vagas_abertas() where evento_id = ev;
  if n <> 0 then raise exception 'FALHOU: vaga assumida continua no mural'; end if;
  begin
    perform assumir_vaga(ev, f);
    raise exception 'FALHOU: assumiu duas vezes';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- Limpeza
  update pessoas set auth_user_id = null where id in (a, b, c);
  delete from eventos where id = ev;
  raise notice 'Vagas abertas: OK';
end $$;
