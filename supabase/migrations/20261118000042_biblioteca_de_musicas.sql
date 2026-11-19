-- =============================================================================
-- Biblioteca de músicas do Louvor.
--   * musicas: o acervo da igreja (título, artista, tom padrão, links de letra/cifra/vídeo/áudio).
--     Só o facilitador do Louvor (e o administrador) cadastra, edita e exclui; Louvor, Projeção e administradores veem.
--   * repertorio_musicas ganha o vínculo com a biblioteca e o TOM daquele culto (o cadastro não muda).
--   * salvar_repertorio: aceita musica_id/tom e cadastra na biblioteca a música digitada que ainda não existe.
--   * O texto do WhatsApp para a Projeção passa a mostrar o tom: "1. Título — Artista (tom G)".
-- =============================================================================
create table musicas (
  id          uuid primary key default gen_random_uuid(),
  igreja_id   uuid not null references igrejas(id) on delete cascade,
  titulo      text not null check (length(btrim(titulo)) between 1 and 120),
  artista     text check (artista is null or length(artista) <= 120),
  tom         text check (tom is null or tom ~ '^[A-G][#b]?m?$'),
  link_letra  text check (link_letra is null or (link_letra ~* '^https?://' and length(link_letra) <= 500)),
  link_cifra  text check (link_cifra is null or (link_cifra ~* '^https?://' and length(link_cifra) <= 500)),
  link_video  text check (link_video is null or (link_video ~* '^https?://' and length(link_video) <= 500)),
  link_audio  text check (link_audio is null or (link_audio ~* '^https?://' and length(link_audio) <= 500)),
  observacao  text check (observacao is null or length(observacao) <= 500),
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index musicas_unica on musicas (igreja_id, lower(btrim(titulo)), lower(coalesce(btrim(artista), '')));

alter table musicas enable row level security;
create policy musicas_leitura on musicas for select to authenticated
  using (igreja_id = minha_igreja() and pode_ver_repertorio());
create policy musicas_inserir on musicas for insert to authenticated
  with check (igreja_id = minha_igreja() and pode_editar_repertorio());
create policy musicas_alterar on musicas for update to authenticated
  using (igreja_id = minha_igreja() and pode_editar_repertorio()) with check (igreja_id = minha_igreja() and pode_editar_repertorio());
create policy musicas_excluir on musicas for delete to authenticated
  using (igreja_id = minha_igreja() and pode_editar_repertorio());

alter table repertorio_musicas
  add column musica_id uuid references musicas(id) on delete set null,
  add column tom text check (tom is null or tom ~ '^[A-G][#b]?m?$');

create or replace function texto_repertorio(p_evento uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(string_agg(linha, E'\n' order by ord), '') from (
    select 1 as ord, 'Abertura:' || E'\n' || string_agg(rm.ordem || '. ' || rm.titulo || coalesce(' — ' || nullif(btrim(rm.artista), ''), '') || coalesce(' (tom ' || rm.tom || ')', ''), E'\n' order by rm.ordem) as linha
      from repertorio_musicas rm where rm.evento_id = p_evento and rm.bloco = 'abertura' having count(*) > 0
    union all
    select 2, 'Ofertório: ' || rm.titulo || coalesce(' — ' || nullif(btrim(rm.artista), ''), '') || coalesce(' (tom ' || rm.tom || ')', '')
      from repertorio_musicas rm where rm.evento_id = p_evento and rm.bloco = 'ofertorio'
    union all
    select 3, 'Encerramento: ' || rm.titulo || coalesce(' — ' || nullif(btrim(rm.artista), ''), '') || coalesce(' (tom ' || rm.tom || ')', '')
      from repertorio_musicas rm where rm.evento_id = p_evento and rm.bloco = 'encerramento'
  ) t
$$;

create or replace function salvar_repertorio(p_evento uuid, p_musicas jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  ig uuid := minha_igreja(); eu uuid := minha_pessoa();
  ev record; x jsonb; n_ab int; n_of int; n_en int; total int;
  novo text; antigo text; agora timestamptz := clock_timestamp(); atual timestamptz;
  pj uuid; rot text; texto text; r record; chave text; ja_tinha boolean;
  mid uuid; tit text; art text; tm text; bi int; cont int[] := array[0, 0, 0];
begin
  if not pode_editar_repertorio() then raise exception 'Só o facilitador do Louvor pode montar o repertório'; end if;
  select id, inicio, titulo into ev from eventos where id = p_evento and igreja_id = ig;
  if not found then raise exception 'Evento não encontrado'; end if;
  if ev.inicio < now() - interval '12 hours' then raise exception 'Esse evento já passou'; end if;
  if p_musicas is null or jsonb_typeof(p_musicas) <> 'array' then raise exception 'Repertório inválido'; end if;

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

  -- Nada mudou? Não mexe no horário nem avisa de novo.
  select string_agg((case e->>'bloco' when 'abertura' then '1' when 'ofertorio' then '2' else '3' end) || '|' || btrim(e->>'titulo') || '|' || btrim(coalesce(e->>'artista', '')) || '|' || btrim(coalesce(e->>'tom', '')), E'\n' order by i)
    into novo from jsonb_array_elements(p_musicas) with ordinality as t(e, i);
  select string_agg((case bloco when 'abertura' then '1' when 'ofertorio' then '2' else '3' end) || '|' || titulo || '|' || coalesce(btrim(artista), '') || '|' || coalesce(tom, ''), E'\n'
         order by case bloco when 'abertura' then 1 when 'ofertorio' then 2 else 3 end, ordem)
    into antigo from repertorio_musicas where evento_id = p_evento;
  select atualizado_em into atual from repertorios where evento_id = p_evento;
  ja_tinha := atual is not null;
  if ja_tinha and antigo is not distinct from novo then return atual; end if;

  insert into repertorios (evento_id, igreja_id, atualizado_em, atualizado_por) values (p_evento, ig, agora, eu)
    on conflict (evento_id) do update set atualizado_em = agora, atualizado_por = eu;
  delete from repertorio_musicas where evento_id = p_evento;
  -- Cada música entra na biblioteca (se ainda não estiver) e o repertório guarda o vínculo, o título e o tom daquele culto
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

  select id into pj from ministerios where igreja_id = ig and nome = 'Projeção';
  rot := rotulo_evento_whatsapp(p_evento);
  texto := (case when ja_tinha then '🎵 O repertório foi atualizado' else '🎵 Repertório do louvor' end)
    || ' — ' || rot || E'\n\n' || texto_repertorio(p_evento) || E'\n\n'
    || 'Atualizado em ' || rotulo_atualizacao(agora) || '. Veja no app: https://maisconectados.com.br/repertorio';
  for r in
    select distinct p.id, p.nome from pessoas p
    where p.id <> eu and (
      exists (select 1 from escalas es where es.evento_id = p_evento and es.ministerio_id = pj and es.pessoa_id = p.id and es.status <> 'recusado')
      or (
        not exists (select 1 from escalas es where es.evento_id = p_evento and es.ministerio_id = pj and es.status <> 'recusado')
        and exists (select 1 from membros_ministerio mm where mm.ministerio_id = pj and mm.pessoa_id = p.id and mm.papel = 'coordenador')
      )
    )
  loop
    chave := 'repertorio:' || p_evento || ':' || r.id || ':' || extract(epoch from agora)::bigint;
    perform enfileirar_whatsapp(r.id, 'repertorio', chave, 'Oi, ' || split_part(r.nome, ' ', 1) || '! ' || texto);
  end loop;
  return agora;
end;
$$;

revoke execute on function salvar_repertorio(uuid, jsonb) from public, anon;
grant execute on function salvar_repertorio(uuid, jsonb) to authenticated;
