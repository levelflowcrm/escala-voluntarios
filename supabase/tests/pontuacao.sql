-- Pontuação: soma, sequência, níveis, troca/cobertura, vaga assumida e quem enxerga o quê.
\set ON_ERROR_STOP 1

do $$
declare
  tm uuid; ig uuid; f1 uuid; f2 uuid; a uuid; b uuid; c uuid; coord uuid;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); uco uuid := gen_random_uuid();
  ev uuid; esc_a uuid; i int; r record; n int; ev_fut uuid; novo uuid;
  evs uuid[] := '{}';
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f1 from funcoes where nome = 'Câmera Black';
  select id into f2 from funcoes where nome = 'Câmera Grua';
  select id into a from pessoas where nome = 'Sérgio';
  select id into coord from pessoas where nome = 'Luciano';
  -- B e C: pessoas novas, sem histórico, para a conta fechar
  insert into pessoas (igreja_id, nome) values (ig, 'Teste Pontos B') returning id into b;
  insert into pessoas (igreja_id, nome) values (ig, 'Teste Pontos C') returning id into c;
  update pessoas set auth_user_id = ua where id = a;
  update pessoas set auth_user_id = ub where id = b;
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = uco where id = coord;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel)
    values (a, tm, 'voluntario'), (b, tm, 'voluntario'), (c, tm, 'voluntario'), (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  insert into habilitacoes (pessoa_id, funcao_id, nivel) values (a, f1, 'apto'), (b, f1, 'apto'), (c, f1, 'apto')
    on conflict (pessoa_id, funcao_id) do update set nivel = 'apto';

  -- A: 5 escalas confirmadas nos últimos 5 dias, 2 delas com "Cheguei" no horário
  for i in 1..5 loop
    insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto pts A' || i, now() - make_interval(days => i)) returning id into ev;
    evs := evs || ev;
    insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
    insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status, chegou_em)
      values (ev, tm, f1, a, 'confirmado', case when i <= 2 then now() - make_interval(days => i) - interval '10 minutes' end)
      returning id into esc_a;
  end loop;
  -- B: 1 confirmada e assumida (mais recente), 1 recusada, 1 sem resposta
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto pts B1', now() - interval '1 day 1 hour') returning id into ev; evs := evs || ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status, assumida) values (ev, tm, f2, b, 'confirmado', true);
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto pts B2', now() - interval '3 days 1 hour') returning id into ev; evs := evs || ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f2, b, 'recusado');
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto pts B3', now() - interval '5 days 1 hour') returning id into ev; evs := evs || ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f2, b, 'pendente');

  -- A: 50 + 3*2 + 2*5 = 66 (plantinha), sequência 5
  select * into r from calcular_pontuacao(a);
  if r.pontos <> 66 or r.nivel <> 'plantinha' or r.servidas <> 5 or r.no_horario <> 2 or r.sequencia <> 5 then
    raise exception 'FALHOU A: pontos %, nivel %, servidas %, no_horario %, seq %', r.pontos, r.nivel, r.servidas, r.no_horario, r.sequencia;
  end if;
  -- B: 10 + 8 (assumida) + 2 (seq 1) - 4 (recusa) - 6 (sem resposta) = 10 (semente)
  select * into r from calcular_pontuacao(b);
  if r.pontos <> 10 or r.nivel <> 'semente' or r.assumiu <> 1 or r.recusou <> 1 or r.sem_resposta <> 1 or r.sequencia <> 1 then
    raise exception 'FALHOU B: pontos %, serv %, hora %, cobriu %, trocou %, assumiu %, recusou %, sem_resp %, seq %', r.pontos, r.servidas, r.no_horario, r.cobriu, r.trocou, r.assumiu, r.recusou, r.sem_resposta, r.sequencia;
  end if;

  -- Troca aceita: A pediu (-2), C cobriu (+8)
  insert into trocas (escala_id, solicitante_id, colega_id, status, respondido_em) values (esc_a, a, c, 'aceita', now());
  select * into r from calcular_pontuacao(a);
  if r.pontos <> 64 or r.trocou <> 1 then raise exception 'FALHOU troca de A: pontos %, trocou %', r.pontos, r.trocou; end if;
  select * into r from calcular_pontuacao(c);
  if r.pontos <> 8 or r.cobriu <> 1 then raise exception 'FALHOU cobertura de C: pontos %, cobriu %', r.pontos, r.cobriu; end if;

  -- Escala em rascunho não pontua
  update escalas_ministerio set publicada = false where evento_id = evs[1];
  select * into r from calcular_pontuacao(a);
  if r.servidas <> 4 then raise exception 'FALHOU: rascunho pontuou (servidas %)', r.servidas; end if;
  update escalas_ministerio set publicada = true where evento_id = evs[1];

  -- Assumir vaga de verdade marca a escala como assumida
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto vaga pts', now() + interval '10 days') returning id into ev_fut; evs := evs || ev_fut;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev_fut, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev_fut, tm, f1, a, 'recusado');
  perform set_config('request.jwt.claim.sub', ub::text, true);
  novo := assumir_vaga(ev_fut, f1);
  if not exists (select 1 from escalas where id = novo and assumida) then raise exception 'FALHOU: vaga assumida não foi marcada'; end if;

  -- Cada um vê a própria; voluntário não vê o time; coordenador vê todos
  perform set_config('request.jwt.claim.sub', ua::text, true);
  select pontos into n from minha_pontuacao();
  if n <> 64 - 4 then raise exception 'FALHOU: minha_pontuacao de A = % (esperado 60, com a recusa)', n; end if;
  select count(*) into n from pontuacao_do_time();
  if n <> 0 then raise exception 'FALHOU: voluntário vê pontuação do time'; end if;
  perform set_config('request.jwt.claim.sub', uco::text, true);
  select count(*) into n from pontuacao_do_time() where pessoa_id in (a, b, c);
  if n <> 3 then raise exception 'FALHOU: coordenador vê % das 3 pessoas', n; end if;

  -- Limpeza
  perform set_config('request.jwt.claim.sub', '', true);
  delete from trocas where escala_id = esc_a;
  delete from eventos where id = any(evs);
  update pessoas set auth_user_id = null where id in (a, b, c, coord);
  delete from pessoas where id in (b, c);
  raise notice 'Pontuação: OK';
end $$;

-- Funções internas não podem ser chamadas direto por quem está logado
do $$
begin
  if has_function_privilege('authenticated', 'calcular_pontuacao(uuid)', 'execute') then
    raise exception 'FALHOU: usuário logado executa calcular_pontuacao direto';
  end if;
  if has_function_privilege('authenticated', 'pode_assumir_vaga(uuid,uuid,uuid)', 'execute')
     or has_function_privilege('authenticated', 'pode_cobrir(uuid,uuid)', 'execute') then
    raise exception 'FALHOU: usuário logado executa função interna de regra';
  end if;
  raise notice 'Funções internas fechadas: OK';
end $$;

-- Faixas de nível: cortes em 30, 70 e 120 (usa a função real com pessoas sem histórico)
do $$
declare p uuid; ig uuid; tm uuid; f uuid; ev uuid; i int; r record; cortes int[] := array[3, 7, 12];
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f from funcoes where nome = 'Câmera Black';
  insert into pessoas (igreja_id, nome) values (ig, 'Teste Faixa') returning id into p;
  -- sem nada: semente
  select * into r from calcular_pontuacao(p);
  if r.nivel <> 'semente' then raise exception 'FALHOU: sem histórico deveria ser semente, é %', r.nivel; end if;
  -- 3 escalas seguidas = 30 + 6 = 36 => plantinha
  for i in 1..16 loop
    insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto faixa ' || i, now() - make_interval(days => i)) returning id into ev;
    insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
    insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, p, 'confirmado');
    if i = 1 then select * into r from calcular_pontuacao(p); if r.pontos <> 12 or r.nivel <> 'semente' then raise exception 'FALHOU: 1 escala = 12 pts semente (%/%)', r.pontos, r.nivel; end if; end if;
    if i = 2 then select * into r from calcular_pontuacao(p); if r.pontos <> 24 or r.nivel <> 'semente' then raise exception 'FALHOU: 2 escalas = 24 pts semente (%/%)', r.pontos, r.nivel; end if; end if;
    if i = 3 then select * into r from calcular_pontuacao(p); if r.pontos <> 36 or r.nivel <> 'plantinha' then raise exception 'FALHOU: 3 escalas = 36 pts plantinha (%/%)', r.pontos, r.nivel; end if; end if;
    if i = 6 then select * into r from calcular_pontuacao(p); if r.pontos <> 72 or r.nivel <> 'arbusto' then raise exception 'FALHOU: 6 escalas = 72 pts arbusto (%/%)', r.pontos, r.nivel; end if; end if;
    if i = 10 then select * into r from calcular_pontuacao(p); if r.pontos <> 120 or r.nivel <> 'arvore' then raise exception 'FALHOU: 10 escalas = 120 pts árvore (%/%)', r.pontos, r.nivel; end if; end if;
    if i = 16 then select * into r from calcular_pontuacao(p); if r.pontos <> 180 or r.nivel <> 'frutifera' then raise exception 'FALHOU: 16 escalas = 180 pts árvore frutífera (%/%)', r.pontos, r.nivel; end if; end if;
  end loop;
  delete from eventos where titulo like 'Culto faixa %';
  delete from pessoas where id = p;
  raise notice 'Faixas de nível: OK';
end $$;
