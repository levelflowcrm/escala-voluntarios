-- =============================================================================
-- "Time de hoje": quem serve junto no mesmo ministério e no mesmo evento, com foto.
--   * fotos_perfil ganha uma miniatura (~96 px) para a tela inicial não carregar fotos grandes.
--   * time_de_hoje(): para cada evento publicado nas próximas 16 h (ou iniciado nas últimas 6 h) em que
--     EU estou escalado (pendente/confirmado), devolve os colegas do MESMO ministério no MESMO evento.
--     Quem não está escalado junto com a pessoa não vê a foto dela.
-- =============================================================================
alter table fotos_perfil add column miniatura text
  check (miniatura is null or (miniatura like 'data:image/jpeg;base64,%' and length(miniatura) <= 30000));

create function time_de_hoje()
returns table (evento_id uuid, evento text, inicio timestamptz, ministerio_id uuid, ministerio text,
               pessoa_id uuid, nome text, funcao text, status text, foto text, aniversario_hoje boolean, sou_eu boolean)
language sql stable security definer set search_path = public as $$
  with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as d),
  meus as (
    select es.evento_id, es.ministerio_id
      from escalas es
      join eventos ev on ev.id = es.evento_id
      join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
     where es.pessoa_id = minha_pessoa()
       and es.status in ('pendente', 'confirmado')
       and ev.igreja_id = minha_igreja()
       and ev.inicio between now() - interval '6 hours' and now() + interval '16 hours'
  )
  select ev.id, ev.titulo, ev.inicio, m.id, m.nome, p.id, split_part(p.nome, ' ', 1), f.nome, es.status::text,
         coalesce(fp.miniatura, fp.foto),
         p.aniversario is not null
           and extract(month from p.aniversario) = extract(month from (select d from hoje))
           and extract(day from p.aniversario) = extract(day from (select d from hoje)),
         p.id = minha_pessoa()
    from meus
    join escalas es on es.evento_id = meus.evento_id and es.ministerio_id = meus.ministerio_id and es.status in ('pendente', 'confirmado')
    join pessoas p on p.id = es.pessoa_id
    join eventos ev on ev.id = es.evento_id
    join ministerios m on m.id = es.ministerio_id
    left join funcoes f on f.id = es.funcao_id
    left join fotos_perfil fp on fp.pessoa_id = p.id
   order by ev.inicio, m.nome, (p.id = minha_pessoa()) desc, p.nome
$$;
revoke execute on function time_de_hoje() from public, anon;
grant execute on function time_de_hoje() to authenticated;
