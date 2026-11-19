-- =============================================================================
-- Ministério de Louvor + repertório do culto.
--   * Louvor entra como ministério (por enquanto só o facilitador; o time vem depois).
--   * O facilitador do Louvor (e o administrador) monta o repertório de cada evento:
--       abertura: 3 a 4 músicas · ofertório: 0 ou 1 (opcional) · encerramento: 1
--   * Cada gravação que muda algo guarda o horário ("atualizado em 18/nov às 19:13") e avisa por WhatsApp
--     a Projeção escalada no evento (se ninguém estiver escalado, os facilitadores da Projeção).
--   * Quem vê: administradores, Louvor e Projeção. Quem grava: só a função salvar_repertorio.
-- =============================================================================
insert into ministerios (igreja_id, nome, cor)
select id, 'Louvor', '#db2777' from igrejas where slug = 'nasci-pra-deus'
on conflict (igreja_id, nome) do nothing;

create table repertorios (
  evento_id      uuid primary key references eventos(id) on delete cascade,
  igreja_id      uuid not null references igrejas(id) on delete cascade,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references pessoas(id) on delete set null
);

create table repertorio_musicas (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references repertorios(evento_id) on delete cascade,
  bloco      text not null check (bloco in ('abertura', 'ofertorio', 'encerramento')),
  ordem      smallint not null,
  titulo     text not null check (length(btrim(titulo)) between 1 and 120),
  artista    text check (artista is null or length(artista) <= 120),
  unique (evento_id, bloco, ordem)
);

create function pode_editar_repertorio() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(sou_coordenador((select id from ministerios where igreja_id = minha_igreja() and nome = 'Louvor' limit 1)), false)
$$;

create function pode_ver_repertorio() returns boolean
language sql stable security definer set search_path = public as $$
  select sou_admin() or exists (
    select 1 from membros_ministerio mm join ministerios m on m.id = mm.ministerio_id
    where mm.pessoa_id = minha_pessoa() and m.igreja_id = minha_igreja() and m.nome in ('Louvor', 'Projeção')
  )
$$;

alter table repertorios enable row level security;
alter table repertorio_musicas enable row level security;
create policy repertorios_leitura on repertorios for select to authenticated
  using (igreja_id = minha_igreja() and pode_ver_repertorio());
create policy repertorio_musicas_leitura on repertorio_musicas for select to authenticated
  using (exists (select 1 from repertorios r where r.evento_id = repertorio_musicas.evento_id));
revoke insert, update, delete on repertorios, repertorio_musicas from anon, authenticated;

-- "18/nov às 19:13" (horário de Brasília)
create function rotulo_atualizacao(p_em timestamptz) returns text
language sql immutable as $$
  select to_char(p_em at time zone 'America/Sao_Paulo', 'DD') || '/'
    || (array['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'])[extract(month from p_em at time zone 'America/Sao_Paulo')::int]
    || ' às ' || to_char(p_em at time zone 'America/Sao_Paulo', 'HH24:MI')
$$;

-- Texto do repertório para o WhatsApp
create function texto_repertorio(p_evento uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(string_agg(linha, E'\n' order by ord), '') from (
    select 1 as ord, 'Abertura:' || E'\n' || string_agg(rm.ordem || '. ' || rm.titulo || coalesce(' — ' || nullif(btrim(rm.artista), ''), ''), E'\n' order by rm.ordem) as linha
      from repertorio_musicas rm where rm.evento_id = p_evento and rm.bloco = 'abertura' having count(*) > 0
    union all
    select 2, 'Ofertório: ' || rm.titulo || coalesce(' — ' || nullif(btrim(rm.artista), ''), '')
      from repertorio_musicas rm where rm.evento_id = p_evento and rm.bloco = 'ofertorio'
    union all
    select 3, 'Encerramento: ' || rm.titulo || coalesce(' — ' || nullif(btrim(rm.artista), ''), '')
      from repertorio_musicas rm where rm.evento_id = p_evento and rm.bloco = 'encerramento'
  ) t
$$;

-- Grava o repertório inteiro de um evento. p_musicas: [{"bloco":"abertura","titulo":"...","artista":"..."}, ...]
-- (a ordem da lista vale como ordem dentro de cada bloco). Devolve o horário da última atualização.
create function salvar_repertorio(p_evento uuid, p_musicas jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  ig uuid := minha_igreja(); eu uuid := minha_pessoa();
  ev record; x jsonb; n_ab int; n_of int; n_en int; total int;
  novo text; antigo text; agora timestamptz := clock_timestamp(); atual timestamptz;
  pj uuid; rot text; texto text; r record; chave text; ja_tinha boolean;
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
  end loop;

  -- Nada mudou? Não mexe no horário nem avisa de novo.
  select string_agg((case e->>'bloco' when 'abertura' then '1' when 'ofertorio' then '2' else '3' end) || '|' || btrim(e->>'titulo') || '|' || btrim(coalesce(e->>'artista', '')), E'\n' order by i)
    into novo from jsonb_array_elements(p_musicas) with ordinality as t(e, i);
  select string_agg((case bloco when 'abertura' then '1' when 'ofertorio' then '2' else '3' end) || '|' || titulo || '|' || coalesce(btrim(artista), ''), E'\n'
         order by case bloco when 'abertura' then 1 when 'ofertorio' then 2 else 3 end, ordem)
    into antigo from repertorio_musicas where evento_id = p_evento;
  select atualizado_em into atual from repertorios where evento_id = p_evento;
  ja_tinha := atual is not null;
  if ja_tinha and antigo is not distinct from novo then return atual; end if;

  insert into repertorios (evento_id, igreja_id, atualizado_em, atualizado_por) values (p_evento, ig, agora, eu)
    on conflict (evento_id) do update set atualizado_em = agora, atualizado_por = eu;
  delete from repertorio_musicas where evento_id = p_evento;
  insert into repertorio_musicas (evento_id, bloco, ordem, titulo, artista)
  select p_evento, e->>'bloco',
         row_number() over (partition by e->>'bloco' order by i),
         btrim(e->>'titulo'), nullif(btrim(coalesce(e->>'artista', '')), '')
  from jsonb_array_elements(p_musicas) with ordinality as t(e, i);

  -- Avisa a Projeção: quem está escalado no evento; sem ninguém escalado, os facilitadores da Projeção
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

revoke execute on function salvar_repertorio(uuid, jsonb), pode_editar_repertorio(), pode_ver_repertorio() from public, anon;
grant execute on function salvar_repertorio(uuid, jsonb), pode_editar_repertorio(), pode_ver_repertorio() to authenticated;
revoke execute on function texto_repertorio(uuid) from public, authenticated, anon;
