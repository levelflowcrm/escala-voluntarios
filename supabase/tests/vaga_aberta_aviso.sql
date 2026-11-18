-- Vaga aberta: ao deixar a escala, os colegas aptos e livres recebem WhatsApp (e só eles).
\set ON_ERROR_STOP 1
do $$
declare
  tm uuid; f uuid; ig uuid; ev uuid; ev2 uuid; esc uuid;
  a uuid; b uuid; c uuid; d uuid; n int; txt text;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  select id into c from pessoas where nome = 'Thamires';
  select id into d from pessoas where nome = 'Marcos';
  update pessoas set celular = '(11) 95402-4081' where id = a;
  update pessoas set celular = '(11) 95402-4082' where id = b;
  update pessoas set celular = '(11) 95402-4083' where id = c;
  update pessoas set celular = '(11) 95402-4084' where id = d;
  insert into membros_ministerio (pessoa_id, ministerio_id) values (a, tm), (b, tm), (c, tm) on conflict do nothing;
  delete from membros_ministerio where pessoa_id = d and ministerio_id = tm; -- D não é do ministério
  insert into habilitacoes (pessoa_id, funcao_id, nivel) values (a, f, 'apto'), (b, f, 'apto'), (c, f, 'aprendiz'), (d, f, 'apto')
    on conflict (pessoa_id, funcao_id) do update set nivel = excluded.nivel;
  delete from fila_whatsapp;

  -- Escala publicada, A titular
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto aviso vaga', date_trunc('day', now()) + interval '30 days' + interval '22 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, tm, f, a, 'pendente') returning id into esc;

  -- A deixa a escala: só B (apto, do ministério, livre) é avisado
  update escalas set status = 'recusado', respondido_em = now() where id = esc;
  select count(*), max(texto) into n, txt from fila_whatsapp where tipo = 'vaga_aberta' and pessoa_id = b;
  if n <> 1 then raise exception 'FALHOU: colega apto deveria receber 1 aviso (%)', n; end if;
  if txt not like '%Câmera Black%' or txt not like '%Culto aviso vaga%' or txt not like '%/vagas%' then raise exception 'FALHOU: texto do aviso inesperado: %', txt; end if;
  if exists (select 1 from fila_whatsapp where tipo = 'vaga_aberta' and pessoa_id in (a, c, d)) then
    raise exception 'FALHOU: avisou quem saiu, aprendiz ou gente de fora do ministério';
  end if;

  -- Repetir o mesmo estado não duplica; confirmar de novo e recusar de novo não explode
  select count(*) into n from fila_whatsapp where tipo = 'vaga_aberta';
  update escalas set respondido_em = now() where id = esc;
  update escalas set status = 'recusado' where id = esc;
  if (select count(*) from fila_whatsapp where tipo = 'vaga_aberta') <> n then raise exception 'FALHOU: duplicou avisos'; end if;

  -- Bloqueio no dia: quem está bloqueado não é avisado
  delete from fila_whatsapp;
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto aviso vaga 2', date_trunc('day', now()) + interval '32 days' + interval '22 hours') returning id into ev2;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev2, tm, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev2, tm, f, a, 'confirmado') returning id into esc;
  insert into bloqueios (pessoa_id, inicio, fim) values (b, (now() + interval '31 days')::date, (now() + interval '33 days')::date);
  update escalas set status = 'recusado' where id = esc;
  select count(*) into n from fila_whatsapp where tipo = 'vaga_aberta' and pessoa_id = b;
  if n <> 0 then raise exception 'FALHOU: avisou colega com bloqueio no dia (%)', n; end if;
  if not exists (select 1 from fila_whatsapp where tipo = 'vaga_aberta') then raise exception 'FALHOU: ninguém foi avisado, nem os livres'; end if;
  delete from bloqueios where pessoa_id = b;

  -- Escala não publicada não avisa ninguém
  delete from fila_whatsapp;
  update escalas_ministerio set publicada = false where evento_id = ev2;
  update escalas set status = 'pendente' where id = esc;
  update escalas set status = 'recusado' where id = esc;
  select count(*) into n from fila_whatsapp where tipo = 'vaga_aberta';
  if n <> 0 then raise exception 'FALHOU: avisou vaga de escala não publicada (%)', n; end if;

  delete from fila_whatsapp;
  delete from eventos where id in (ev, ev2);
  raise notice 'Aviso de vaga aberta: OK';
end $$;
