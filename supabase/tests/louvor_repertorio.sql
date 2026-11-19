-- Repertório do Louvor: só o facilitador do Louvor grava; regras 3-4 abertura / ofertório opcional / 1 encerramento;
-- horário de atualização; WhatsApp só para a Projeção escalada; só Louvor/Projeção/admin enxergam.
\set ON_ERROR_STOP 1
do $$
declare
  ig uuid; lv uuid; pj uuid; f uuid; ev uuid; ev_passado uuid; t1 timestamptz; t2 timestamptz; t3 timestamptz;
  c uuid; d uuid; k uuid; n int; txt text; cont int;
  uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid(); uk uuid := gen_random_uuid();
  basico jsonb := '[{"bloco":"abertura","titulo":"Música 1","artista":"Banda A"},{"bloco":"abertura","titulo":"Música 2"},{"bloco":"abertura","titulo":"Música 3"},{"bloco":"encerramento","titulo":"Final"}]';
  completo jsonb := '[{"bloco":"abertura","titulo":"Música 1","artista":"Banda A"},{"bloco":"abertura","titulo":"Música 2"},{"bloco":"abertura","titulo":"Música 3"},{"bloco":"ofertorio","titulo":"Ofertar"},{"bloco":"encerramento","titulo":"Final"}]';
begin
  select id, igreja_id into lv, ig from ministerios where nome = 'Louvor';
  select id into pj from ministerios where nome = 'Projeção';
  select id into f from funcoes where nome = 'Holyrics';
  select id into c from pessoas where nome = 'Thamires';
  select id into d from pessoas where nome = 'Diogo';
  select id into k from pessoas where nome = 'Marcos';
  update pessoas set auth_user_id = uc, celular = '(11) 95402-4091' where id = c;
  update pessoas set auth_user_id = ud, celular = '(11) 95402-4092' where id = d;
  update pessoas set auth_user_id = uk, celular = '(11) 95402-4093' where id = k;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (c, lv, 'coordenador'), (d, pj, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = excluded.papel;
  delete from membros_ministerio where pessoa_id = k and ministerio_id in (lv, pj);
  delete from fila_whatsapp;

  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto repertório', date_trunc('day', now()) + interval '30 days' + interval '22 hours') returning id into ev;
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto antigo', now() - interval '3 days') returning id into ev_passado;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, pj, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, pj, f, d, 'pendente');

  set local role authenticated;

  -- Voluntário da Projeção não grava
  perform set_config('request.jwt.claim.sub', ud::text, true);
  begin perform salvar_repertorio(ev, basico); raise exception 'FALHOU: voluntário gravou repertório';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- Facilitador do Louvor: regras do repertório
  perform set_config('request.jwt.claim.sub', uc::text, true);
  begin perform salvar_repertorio(ev, '[{"bloco":"abertura","titulo":"A"},{"bloco":"abertura","titulo":"B"},{"bloco":"encerramento","titulo":"Z"}]'); raise exception 'FALHOU: aceitou só 2 de abertura';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform salvar_repertorio(ev, '[{"bloco":"abertura","titulo":"A"},{"bloco":"abertura","titulo":"B"},{"bloco":"abertura","titulo":"C"},{"bloco":"abertura","titulo":"D"},{"bloco":"abertura","titulo":"E"},{"bloco":"encerramento","titulo":"Z"}]'); raise exception 'FALHOU: aceitou 5 de abertura';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform salvar_repertorio(ev, '[{"bloco":"abertura","titulo":"A"},{"bloco":"abertura","titulo":"B"},{"bloco":"abertura","titulo":"C"}]'); raise exception 'FALHOU: aceitou sem encerramento';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform salvar_repertorio(ev, '[{"bloco":"abertura","titulo":"A"},{"bloco":"abertura","titulo":"B"},{"bloco":"abertura","titulo":" "},{"bloco":"encerramento","titulo":"Z"}]'); raise exception 'FALHOU: aceitou título vazio';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  begin perform salvar_repertorio(ev_passado, basico); raise exception 'FALHOU: gravou em evento que já passou';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;

  -- Gravação válida (sem ofertório): horário e aviso à Projeção escalada
  t1 := salvar_repertorio(ev, basico);
  if t1 is null then raise exception 'FALHOU: sem horário de atualização'; end if;
  reset role;
  select count(*), max(texto) into n, txt from fila_whatsapp where tipo = 'repertorio' and pessoa_id = d;
  if n <> 1 or txt not like '%Culto repertório%' or txt not like '%1. Música 1 — Banda A%' or txt not like '%Encerramento: Final%' or txt not like '%Atualizado em %' or txt like '%Ofertório%' then
    raise exception 'FALHOU: aviso inesperado (% / %)', n, txt;
  end if;
  if exists (select 1 from fila_whatsapp where tipo = 'repertorio' and pessoa_id in (c, k)) then raise exception 'FALHOU: avisou quem não é da Projeção escalada'; end if;

  -- Gravar igual: não muda horário nem duplica aviso
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  t2 := salvar_repertorio(ev, basico);
  if t2 <> t1 then raise exception 'FALHOU: horário mudou sem mudança'; end if;
  reset role;
  select count(*) into n from fila_whatsapp where tipo = 'repertorio';
  if n <> 1 then raise exception 'FALHOU: avisou de novo sem mudança (%)', n; end if;

  -- Mudou (entrou o ofertório): novo horário e novo aviso "atualizado"
  perform pg_sleep(1.1);
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  t3 := salvar_repertorio(ev, completo);
  if t3 <= t1 then raise exception 'FALHOU: horário não avançou'; end if;
  reset role;
  select count(*) into n from fila_whatsapp where tipo = 'repertorio' and pessoa_id = d and texto like '%foi atualizado%' and texto like '%Ofertório: Ofertar%';
  if n <> 1 then raise exception 'FALHOU: aviso de atualização não saiu'; end if;

  -- Leitura: Projeção vê; quem é de fora não vê; ninguém grava direto
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ud::text, true);
  select count(*) into cont from repertorio_musicas where evento_id = ev;
  if cont <> 5 then raise exception 'FALHOU: Projeção deveria ver 5 músicas (%)', cont; end if;
  begin insert into repertorio_musicas (evento_id, bloco, ordem, titulo) values (ev, 'abertura', 9, 'X'); raise exception 'FALHOU: escrita direta permitida';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub', uk::text, true);
  select count(*) into cont from repertorio_musicas where evento_id = ev;
  select count(*) into n from repertorios where evento_id = ev;
  if cont <> 0 or n <> 0 then raise exception 'FALHOU: quem é de fora enxergou o repertório'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  update pessoas set auth_user_id = null where id in (c, d, k);
  raise notice 'Repertório do Louvor: OK';
end $$;
