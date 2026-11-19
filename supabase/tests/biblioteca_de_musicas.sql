-- Biblioteca de músicas: só o facilitador do Louvor grava; Louvor/Projeção/admin veem; links http(s); tom válido;
-- salvar_repertorio cadastra a música nova na biblioteca, guarda o tom do culto e mostra o tom no WhatsApp.
\set ON_ERROR_STOP 1
do $$
declare
  ig uuid; lv uuid; pj uuid; f uuid; ev uuid; c uuid; d uuid; k uuid; n int; txt text; mid uuid; id1 uuid;
  uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid(); uk uuid := gen_random_uuid();
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
  delete from repertorio_musicas; delete from repertorios; delete from musicas;
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto biblioteca', date_trunc('day', now()) + interval '31 days' + interval '22 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, pj, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, pj, f, d, 'pendente');

  set local role authenticated;
  -- Facilitador do Louvor cadastra
  perform set_config('request.jwt.claim.sub', uc::text, true);
  insert into musicas (igreja_id, titulo, artista, tom, link_letra, link_video) values (ig, 'Grande é o Senhor', 'Adhemar de Campos', 'G', 'https://exemplo.com/letra', 'https://youtu.be/abc') returning id into id1;
  begin insert into musicas (igreja_id, titulo, artista) values (ig, 'grande é o senhor ', 'adhemar de campos'); raise exception 'FALHOU: aceitou música repetida';
  exception when unique_violation then null; end;
  begin insert into musicas (igreja_id, titulo, link_letra) values (ig, 'Link ruim', 'javascript:alert(1)'); raise exception 'FALHOU: aceitou link que não é http';
  exception when check_violation then null; end;
  begin insert into musicas (igreja_id, titulo, tom) values (ig, 'Tom ruim', 'H'); raise exception 'FALHOU: aceitou tom inválido';
  exception when check_violation then null; end;
  update musicas set tom = 'A' where id = id1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: facilitador não editou'; end if;

  -- Voluntário da Projeção vê, mas não grava nem exclui
  perform set_config('request.jwt.claim.sub', ud::text, true);
  select count(*) into n from musicas;
  if n <> 1 then raise exception 'FALHOU: Projeção deveria ver 1 música, viu %', n; end if;
  begin insert into musicas (igreja_id, titulo) values (ig, 'Intrusa'); raise exception 'FALHOU: Projeção cadastrou música';
  exception when insufficient_privilege then null; end;
  update musicas set titulo = 'Alterada' where id = id1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Projeção alterou música'; end if;
  delete from musicas where id = id1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Projeção excluiu música'; end if;

  -- Quem não é do Louvor/Projeção não vê nada
  perform set_config('request.jwt.claim.sub', uk::text, true);
  select count(*) into n from musicas;
  if n <> 0 then raise exception 'FALHOU: quem não é do Louvor/Projeção viu a biblioteca'; end if;

  -- Repertório: usa música da biblioteca (com outro tom) e cadastra a nova
  perform set_config('request.jwt.claim.sub', uc::text, true);
  perform salvar_repertorio(ev, jsonb_build_array(
    jsonb_build_object('bloco','abertura','titulo','Grande é o Senhor','artista','Adhemar de Campos','tom','Bb','musica_id', id1),
    jsonb_build_object('bloco','abertura','titulo','Música Nova','artista','Banda X','tom','C'),
    jsonb_build_object('bloco','abertura','titulo','Outra'),
    jsonb_build_object('bloco','encerramento','titulo','Final','tom','D')));
  begin
    perform salvar_repertorio(ev, jsonb_build_array(
      jsonb_build_object('bloco','abertura','titulo','A','tom','Z'), jsonb_build_object('bloco','abertura','titulo','B'),
      jsonb_build_object('bloco','abertura','titulo','C'), jsonb_build_object('bloco','encerramento','titulo','D')));
    raise exception 'FALHOU: aceitou tom inválido no repertório';
  exception when raise_exception then if sqlerrm like 'FALHOU%' then raise; end if; end;
  select count(*) into n from musicas;
  if n <> 4 then raise exception 'FALHOU: biblioteca deveria ter 4 músicas (1 + 3 novas), tem %', n; end if;
  if not exists (select 1 from repertorio_musicas where evento_id = ev and titulo = 'Grande é o Senhor' and tom = 'Bb' and musica_id = id1) then
    raise exception 'FALHOU: não guardou o tom do culto / vínculo com a biblioteca';
  end if;
  if (select tom from musicas where id = id1) <> 'A' then raise exception 'FALHOU: o tom do culto mudou o cadastro da música'; end if;
  reset role;
  select texto into txt from fila_whatsapp where tipo = 'repertorio' and pessoa_id = d;
  if txt is null or txt not like '%1. Grande é o Senhor — Adhemar de Campos (tom Bb)%' or txt not like '%Encerramento: Final (tom D)%' then
    raise exception 'FALHOU: WhatsApp sem o tom (%)', txt;
  end if;

  -- Excluir música da biblioteca não apaga o repertório que já a usou
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uc::text, true);
  delete from musicas where id = id1;
  if not exists (select 1 from repertorio_musicas where evento_id = ev and titulo = 'Grande é o Senhor' and musica_id is null) then
    raise exception 'FALHOU: excluir da biblioteca deveria manter o repertório (sem vínculo)';
  end if;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  update pessoas set auth_user_id = null where id in (c, d, k);
  raise notice 'Biblioteca de músicas: OK';
end $$;
