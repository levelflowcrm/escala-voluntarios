-- MaisFeliz: janela, quem pode votar, voto único, anonimato e resumo só com 3+ votos.
\set ON_ERROR_STOP 1

do $$
declare
  tm uuid; ig uuid; ev uuid; ev_futuro uuid; f1 uuid; f2 uuid; f3 uuid; f4 uuid;
  a uuid; b uuid; c uuid; d uuid; coord uuid;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ud uuid := gen_random_uuid(); uco uuid := gen_random_uuid();
  n int; r record;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f1 from funcoes where nome = 'Câmera Black';
  select id into f2 from funcoes where nome = 'Câmera Grua';
  select id into f3 from funcoes where nome = 'Câmera Móvel';
  select id into f4 from funcoes where nome = 'DTV-Transmissão';
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  select id into c from pessoas where nome = 'Thamires';
  select id into d from pessoas where nome = 'Josy';
  select id into coord from pessoas where nome = 'Luciano';
  update pessoas set auth_user_id = ua where id = a;
  update pessoas set auth_user_id = ub where id = b;
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = ud where id = d;
  update pessoas set auth_user_id = uco where id = coord;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel)
    values (a, tm, 'voluntario'), (b, tm, 'voluntario'), (c, tm, 'voluntario'), (d, tm, 'voluntario'), (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;

  -- Culto que começou há 3 horas, escala publicada: A, B e C serviram; D está recusada
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto maisfeliz', now() - interval '3 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values
    (ev, tm, f1, a, 'confirmado'), (ev, tm, f2, b, 'confirmado'), (ev, tm, f3, c, 'pendente'), (ev, tm, f4, d, 'recusado');
  update escalas set chegou_em = now() - interval '3 hours' where evento_id = ev and pessoa_id = c; -- C só avisou "Cheguei"
  -- Culto que ainda não começou
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto futuro mf', now() + interval '5 hours') returning id into ev_futuro;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev_futuro, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev_futuro, tm, f1, a, 'confirmado');

  -- A vê o evento como pendente de avaliação
  perform set_config('request.jwt.claim.sub', ua::text, true);
  select count(*) into n from maisfeliz_pendentes() where evento_id = ev;
  if n <> 1 then raise exception 'FALHOU: A deveria ter 1 avaliação pendente, tem %', n; end if;

  -- Antes de o culto começar não dá para votar
  begin
    perform registrar_maisfeliz(ev_futuro, 5);
    raise exception 'FALHOU: votou antes do culto';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  -- Nota inválida
  begin
    perform registrar_maisfeliz(ev, 6);
    raise exception 'FALHOU: aceitou nota 6';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- D (recusou) não pode votar
  perform set_config('request.jwt.claim.sub', ud::text, true);
  begin
    perform registrar_maisfeliz(ev, 3);
    raise exception 'FALHOU: quem recusou votou';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- A vota; segunda vez é barrada; some das pendências
  perform set_config('request.jwt.claim.sub', ua::text, true);
  perform registrar_maisfeliz(ev, 5);
  begin
    perform registrar_maisfeliz(ev, 1);
    raise exception 'FALHOU: votou duas vezes';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  select count(*) into n from maisfeliz_pendentes() where evento_id = ev;
  if n <> 0 then raise exception 'FALHOU: avaliação continua pendente depois de votar'; end if;

  -- Acesso direto às tabelas é negado para o usuário logado
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  begin
    perform 1 from maisfeliz_votos limit 1;
    raise exception 'FALHOU: leu votos direto';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from maisfeliz_participacao limit 1;
    raise exception 'FALHOU: leu participações direto';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Com 1 voto, o coordenador vê só o total (sem contagens nem média)
  perform set_config('request.jwt.claim.sub', uco::text, true);
  select * into r from resumo_maisfeliz() where evento_id = ev;
  if r.total <> 1 or r.n5 is not null or r.media is not null then raise exception 'FALHOU: resumo vazou com poucos votos'; end if;

  -- B e C votam (C entrou pelo "Cheguei"); agora são 3 votos
  perform set_config('request.jwt.claim.sub', ub::text, true);
  perform registrar_maisfeliz(ev, 4);
  perform set_config('request.jwt.claim.sub', uc::text, true);
  perform registrar_maisfeliz(ev, 3);

  perform set_config('request.jwt.claim.sub', uco::text, true);
  select * into r from resumo_maisfeliz() where evento_id = ev;
  if r.total <> 3 or r.n5 <> 1 or r.n4 <> 1 or r.n3 <> 1 or r.n1 <> 0 or r.media <> 4.0 then
    raise exception 'FALHOU: resumo errado: total %, n5 %, n4 %, n3 %, media %', r.total, r.n5, r.n4, r.n3, r.media;
  end if;

  -- Voluntário comum não vê resumo
  perform set_config('request.jwt.claim.sub', ua::text, true);
  select count(*) into n from resumo_maisfeliz();
  if n <> 0 then raise exception 'FALHOU: voluntário comum vê o resumo'; end if;

  -- Limpeza
  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id in (ev, ev_futuro);
  update pessoas set auth_user_id = null where id in (a, b, c, d, coord);
  raise notice 'MaisFeliz: OK';
end $$;
