-- Troca entre colegas.
\set ON_ERROR_STOP 1

do $$
declare
  tm uuid; f uuid; ig uuid; ev uuid; esc uuid; tr uuid; n int;
  a uuid; b uuid; c uuid; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
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

  insert into eventos (igreja_id, titulo, inicio)
    values (ig, 'Culto trocas', date_trunc('day', now()) + interval '30 days' + interval '22 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status)
    values (ev, tm, f, a, 'confirmado') returning id into esc;

  if not pode_cobrir(b, esc) then raise exception 'FALHOU: apto não pode cobrir'; end if;
  if pode_cobrir(a, esc) then raise exception 'FALHOU: dono cobriu a própria escala'; end if;
  if pode_cobrir(c, esc) then raise exception 'FALHOU: aprendiz pode cobrir'; end if;

  -- A pede troca com B
  perform set_config('request.jwt.claim.sub', ua::text, true);
  if not exists (select 1 from colegas_para_troca(esc) where pessoa_id = b) then raise exception 'FALHOU: B deveria aparecer como colega'; end if;
  if exists (select 1 from colegas_para_troca(esc) where pessoa_id in (a, c)) then raise exception 'FALHOU: dono ou aprendiz na lista'; end if;
  begin perform pedir_troca(esc, c); raise exception 'FALHOU: pediu troca com aprendiz';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  tr := pedir_troca(esc, b);
  begin perform pedir_troca(esc, b); raise exception 'FALHOU: pedido duplicado';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- C não consegue aceitar pedido alheio
  perform set_config('request.jwt.claim.sub', uc::text, true);
  begin perform responder_troca(tr, true); raise exception 'FALHOU: terceiro aceitou';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- B vê o pedido e aceita
  perform set_config('request.jwt.claim.sub', ub::text, true);
  select count(*) into n from minhas_trocas() where direcao = 'recebida';
  if n <> 1 then raise exception 'FALHOU: B deveria ver 1 pedido recebido'; end if;
  perform responder_troca(tr, true);

  if not exists (select 1 from escalas where id = esc and status = 'trocado') then raise exception 'FALHOU: escala de A não ficou trocada'; end if;
  if not exists (select 1 from escalas where evento_id = ev and pessoa_id = b and funcao_id = f and status = 'confirmado') then
    raise exception 'FALHOU: B não assumiu';
  end if;
  begin perform responder_troca(tr, true); raise exception 'FALHOU: respondeu duas vezes';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- Recusa e cancelamento: nova escala para A em outro evento
  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id = ev;
  insert into eventos (igreja_id, titulo, inicio)
    values (ig, 'Culto trocas 2', date_trunc('day', now()) + interval '31 days' + interval '22 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status)
    values (ev, tm, f, a, 'pendente') returning id into esc;
  perform set_config('request.jwt.claim.sub', ua::text, true);
  tr := pedir_troca(esc, b);
  perform cancelar_troca(tr);
  tr := pedir_troca(esc, b);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  perform responder_troca(tr, false);
  if not exists (select 1 from escalas where id = esc and status = 'pendente') then raise exception 'FALHOU: recusa mexeu na escala'; end if;

  perform set_config('request.jwt.claim.sub', '', true);
  delete from eventos where id = ev;
  update pessoas set auth_user_id = null where id in (a, b, c);
  raise notice 'Trocas: OK';
end $$;
