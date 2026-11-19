-- =============================================================================
-- Aviso do repertório: três jeitos de salvar e destinatários certos.
--   * 'rascunho'  : salva sem avisar e sem a Projeção ver.
--   * 'agora'     : publica e avisa na hora (é o que sempre acontece depois de publicado).
--   * 'programar' : guarda para ser publicado e avisado às 7h30 (Brasília) do DIA do culto
--                   (rotina diária das 7h30: enviar_repertorios_programados()).
--   * Quem recebe: a equipe de Louvor escalada no culto e a Projeção escalada no culto
--     (sem ninguém da Projeção escalado, os facilitadores da Projeção). Quem salvou não recebe.
--   * Enquanto não publicado, só o Louvor/administrador vê o repertório.
-- =============================================================================
alter table repertorios
  add column publicado boolean not null default true,
  add column programado_para date;

drop policy repertorios_leitura on repertorios;
create policy repertorios_leitura on repertorios for select to authenticated
  using (igreja_id = minha_igreja() and pode_ver_repertorio() and (publicado or pode_editar_repertorio()));

-- Monta e enfileira o WhatsApp do repertório (uso interno)
create function avisar_repertorio(p_evento uuid, p_excluir uuid, p_atualizacao boolean, p_em timestamptz)
returns void
language plpgsql security definer set search_path = public as $$
declare
  ig uuid; pj uuid; lv uuid; texto text; r record; chave text;
begin
  select igreja_id into ig from eventos where id = p_evento;
  if ig is null then return; end if;
  select id into pj from ministerios where igreja_id = ig and nome = 'Projeção';
  select id into lv from ministerios where igreja_id = ig and nome = 'Louvor';
  texto := (case when p_atualizacao then '🎵 O repertório foi atualizado' else '🎵 Repertório do louvor' end)
    || ' — ' || rotulo_evento_whatsapp(p_evento) || E'\n\n' || texto_repertorio(p_evento) || E'\n\n'
    || 'Atualizado em ' || rotulo_atualizacao(p_em) || '. Veja no app: https://maisconectados.com.br/repertorio';
  for r in
    select distinct p.id, p.nome from pessoas p
    where p.id is distinct from p_excluir and (
      -- equipe de Louvor escalada no culto
      exists (select 1 from escalas es where es.evento_id = p_evento and es.ministerio_id = lv and es.pessoa_id = p.id and es.status <> 'recusado')
      -- Projeção escalada no culto
      or exists (select 1 from escalas es where es.evento_id = p_evento and es.ministerio_id = pj and es.pessoa_id = p.id and es.status <> 'recusado')
      -- sem ninguém da Projeção escalado: os facilitadores da Projeção
      or (
        not exists (select 1 from escalas es where es.evento_id = p_evento and es.ministerio_id = pj and es.status <> 'recusado')
        and exists (select 1 from membros_ministerio mm where mm.ministerio_id = pj and mm.pessoa_id = p.id and mm.papel = 'coordenador')
      )
    )
  loop
    chave := 'repertorio:' || p_evento || ':' || r.id || ':' || (extract(epoch from p_em) * 1000000)::bigint;
    perform enfileirar_whatsapp(r.id, 'repertorio', chave, 'Oi, ' || split_part(r.nome, ' ', 1) || '! ' || texto);
  end loop;
end;
$$;
revoke execute on function avisar_repertorio(uuid, uuid, boolean, timestamptz) from public, authenticated, anon;

drop function salvar_repertorio(uuid, jsonb);
create function salvar_repertorio(p_evento uuid, p_musicas jsonb, p_modo text default 'agora')
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  ig uuid := minha_igreja(); eu uuid := minha_pessoa();
  ev record; rep record; x jsonb; n_ab int; n_of int; n_en int; total int;
  novo text; antigo text; agora timestamptz := clock_timestamp();
  mid uuid; tit text; art text; tm text; bi int; cont int[] := array[0, 0, 0];
  existe boolean; dia_evento date; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not pode_editar_repertorio() then raise exception 'Só o facilitador do Louvor pode montar o repertório'; end if;
  if p_modo not in ('rascunho', 'agora', 'programar') then raise exception 'Modo de envio inválido'; end if;
  select id, inicio, titulo into ev from eventos where id = p_evento and igreja_id = ig;
  if not found then raise exception 'Evento não encontrado'; end if;
  if ev.inicio < now() - interval '12 hours' then raise exception 'Esse evento já passou'; end if;
  if p_musicas is null or jsonb_typeof(p_musicas) <> 'array' then raise exception 'Repertório inválido'; end if;

  select publicado, programado_para, atualizado_em into rep from repertorios where evento_id = p_evento;
  existe := found;
  if existe and rep.publicado and p_modo <> 'agora' then
    raise exception 'Esse repertório já foi enviado: use Notificar agora para atualizar';
  end if;
  dia_evento := (ev.inicio at time zone 'America/Sao_Paulo')::date;
  if p_modo = 'programar' and (dia_evento < hoje or (dia_evento = hoje and (now() at time zone 'America/Sao_Paulo')::time >= time '07:30')) then
    raise exception 'Já passou das 7h30 desse dia: use Notificar agora';
  end if;

  total := jsonb_array_length(p_musicas);
  select count(*) filter (where e->>'bloco' = 'abertura'), count(*) filter (where e->>'bloco' = 'ofertorio'),
         count(*) filter (where e->>'bloco' = 'encerramento')
    into n_ab, n_of, n_en from jsonb_array_elements(p_musicas) e;
  if n_ab + n_of + n_en <> total then raise exception 'Repertório inválido'; end if;
  if n_ab not between 3 and 4 then raise exception 'A abertura precisa ter de 3 a 4 músicas'; end if;
  if n_of > 1 then raise exception 'O ofertório tem no máximo 1 música (e é opcional)'; end if;
  if n_en <> 1 then raise exception 'O encerramento precisa ter 1 música'; end if;
  for x in select e from jsonb_array_elements(p_musicas) e loop
    if length(btrim(coalesce(x->>'titulo', ''))) not between 1 and 120 then raise exception 'Cada música precisa de um título (até 120 letras)'; end if;
    if length(coalesce(x->>'artista', '')) > 120 then raise exception 'Nome do artista muito longo'; end if;
    if btrim(coalesce(x->>'tom', '')) <> '' and btrim(x->>'tom') !~ '^[A-G][#b]?m?$' then raise exception 'Tom inválido (ex.: G, Bb, F#m)'; end if;
  end loop;

  -- Já publicado e nada mudou (além do tom)? Não mexe no horário nem avisa de novo.
  if existe and rep.publicado and p_modo = 'agora' then
    select string_agg((case e->>'bloco' when 'abertura' then '1' when 'ofertorio' then '2' else '3' end) || '|' || btrim(e->>'titulo') || '|' || btrim(coalesce(e->>'artista', '')), E'\n' order by i)
      into novo from jsonb_array_elements(p_musicas) with ordinality as t(e, i);
    select string_agg((case bloco when 'abertura' then '1' when 'ofertorio' then '2' else '3' end) || '|' || titulo || '|' || coalesce(btrim(artista), ''), E'\n'
           order by case bloco when 'abertura' then 1 when 'ofertorio' then 2 else 3 end, ordem)
      into antigo from repertorio_musicas where evento_id = p_evento;
    if antigo is not distinct from novo then
      update repertorio_musicas rm set tom = nullif(btrim(coalesce(s.e->>'tom', '')), '')
        from (select e, row_number() over (partition by e->>'bloco' order by i) as ord from jsonb_array_elements(p_musicas) with ordinality as t(e, i)) s
       where rm.evento_id = p_evento and rm.bloco = s.e->>'bloco' and rm.ordem = s.ord;
      return rep.atualizado_em;
    end if;
  end if;

  insert into repertorios (evento_id, igreja_id, atualizado_em, atualizado_por, publicado, programado_para)
    values (p_evento, ig, agora, eu, p_modo = 'agora', case when p_modo = 'programar' then dia_evento end)
    on conflict (evento_id) do update set atualizado_em = agora, atualizado_por = eu, publicado = (p_modo = 'agora'),
      programado_para = case when p_modo = 'programar' then dia_evento end;
  delete from repertorio_musicas where evento_id = p_evento;
  for x in select e from jsonb_array_elements(p_musicas) with ordinality as t(e, i) order by i loop
    tit := btrim(x->>'titulo'); art := nullif(btrim(coalesce(x->>'artista', '')), ''); tm := nullif(btrim(coalesce(x->>'tom', '')), '');
    mid := case when coalesce(x->>'musica_id', '') ~ '^[0-9a-f-]{36}$' then (x->>'musica_id')::uuid end;
    if mid is not null and not exists (select 1 from musicas where id = mid and igreja_id = ig) then mid := null; end if;
    if mid is null then
      select id into mid from musicas where igreja_id = ig and lower(btrim(titulo)) = lower(tit) and lower(coalesce(btrim(artista), '')) = lower(coalesce(art, ''));
      if mid is null then
        insert into musicas (igreja_id, titulo, artista, tom) values (ig, tit, art, tm) returning id into mid;
      end if;
    end if;
    bi := case x->>'bloco' when 'abertura' then 1 when 'ofertorio' then 2 else 3 end;
    cont[bi] := cont[bi] + 1;
    insert into repertorio_musicas (evento_id, bloco, ordem, titulo, artista, musica_id, tom)
    values (p_evento, x->>'bloco', cont[bi], tit, art, mid, tm);
  end loop;

  if p_modo = 'agora' then
    perform avisar_repertorio(p_evento, eu, coalesce(rep.publicado, false), agora);
  end if;
  return agora;
end;
$$;
revoke execute on function salvar_repertorio(uuid, jsonb, text) from public, anon;
grant execute on function salvar_repertorio(uuid, jsonb, text) to authenticated;

-- Rotina das 7h30 (Brasília): publica e avisa os repertórios programados para hoje
create function enviar_repertorios_programados()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; agora timestamptz; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  for r in select evento_id, atualizado_por from repertorios where not publicado and programado_para = hoje loop
    agora := clock_timestamp();
    update repertorios set publicado = true, programado_para = null, atualizado_em = agora where evento_id = r.evento_id;
    perform avisar_repertorio(r.evento_id, r.atualizado_por, false, agora);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function enviar_repertorios_programados() from public, authenticated, anon;
