-- =============================================================================
-- MaisFeliz: ao fim do culto/escala o voluntário escolhe um emoji (1 a 5) para
-- dizer como foi. O voto é ANÔNIMO e o líder só vê o resumo.
--
-- Anonimato por desenho:
--   maisfeliz_votos          -> só evento, ministério, nota e o DIA (sem pessoa, sem horário)
--   maisfeliz_participacao   -> só evento + pessoa (impede voto duplicado), sem nota
--   Nenhuma das duas tem política de leitura: só as funções abaixo as acessam.
--   O resumo só mostra as contagens com 3 votos ou mais no evento/ministério.
--
-- Quem pode votar: quem serviu (escala confirmada ou com "Cheguei") em escala
-- publicada, de 1 h depois do início até 36 h depois.
-- =============================================================================
create table maisfeliz_votos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  ministerio_id uuid not null references ministerios(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  dia date not null default current_date
);
create index on maisfeliz_votos (evento_id, ministerio_id);

create table maisfeliz_participacao (
  evento_id uuid not null references eventos(id) on delete cascade,
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  primary key (evento_id, pessoa_id)
);

alter table maisfeliz_votos enable row level security;
alter table maisfeliz_participacao enable row level security;
revoke all on maisfeliz_votos, maisfeliz_participacao from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on maisfeliz_votos, maisfeliz_participacao from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on maisfeliz_votos, maisfeliz_participacao from authenticated';
  end if;
end $$;

-- Eventos em que a pessoa serviu e ainda pode reagir
create function maisfeliz_pendentes()
returns table (evento_id uuid, titulo text, inicio timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct ev.id, ev.titulo, ev.inicio
    from escalas es
    join eventos ev on ev.id = es.evento_id
    join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
   where es.pessoa_id = minha_pessoa()
     and (es.status = 'confirmado' or es.chegou_em is not null)
     and now() between ev.inicio + interval '1 hour' and ev.inicio + interval '36 hours'
     and not exists (select 1 from maisfeliz_participacao mp where mp.evento_id = ev.id and mp.pessoa_id = es.pessoa_id)
   order by ev.inicio desc
$$;

create function registrar_maisfeliz(p_evento uuid, p_nota int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := minha_pessoa();
  min uuid;
begin
  if eu is null then raise exception 'Sem cadastro'; end if;
  if p_nota is null or p_nota not between 1 and 5 then raise exception 'Nota inválida'; end if;
  select es.ministerio_id into min
    from escalas es
    join eventos ev on ev.id = es.evento_id
    join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
   where es.evento_id = p_evento and es.pessoa_id = eu
     and (es.status = 'confirmado' or es.chegou_em is not null)
     and now() between ev.inicio + interval '1 hour' and ev.inicio + interval '36 hours'
   order by es.ministerio_id
   limit 1;
  if min is null then raise exception 'Você não pode avaliar este evento agora'; end if;
  begin
    insert into maisfeliz_participacao (evento_id, pessoa_id) values (p_evento, eu);
  exception when unique_violation then
    raise exception 'Você já avaliou este evento';
  end;
  insert into maisfeliz_votos (evento_id, ministerio_id, nota) values (p_evento, min, p_nota);
end $$;

-- Resumo para o líder (últimos 60 dias). Contagens só com 3+ votos.
create function resumo_maisfeliz()
returns table (evento_id uuid, evento text, inicio timestamptz, ministerio text, total int,
               n1 int, n2 int, n3 int, n4 int, n5 int, media numeric)
language sql stable security definer set search_path = public as $$
  select * from (
    select v.evento_id, ev.titulo, ev.inicio, m.nome, count(*)::int as total,
           case when count(*) >= 3 then count(*) filter (where v.nota = 1)::int end,
           case when count(*) >= 3 then count(*) filter (where v.nota = 2)::int end,
           case when count(*) >= 3 then count(*) filter (where v.nota = 3)::int end,
           case when count(*) >= 3 then count(*) filter (where v.nota = 4)::int end,
           case when count(*) >= 3 then count(*) filter (where v.nota = 5)::int end,
           case when count(*) >= 3 then round(avg(v.nota), 1) end
      from maisfeliz_votos v
      join eventos ev on ev.id = v.evento_id
      join ministerios m on m.id = v.ministerio_id
     where sou_coordenador(v.ministerio_id)
       and ev.inicio > now() - interval '60 days'
     group by v.evento_id, ev.titulo, ev.inicio, m.nome
  ) r
  order by 3 desc, 4
$$;

revoke all on function maisfeliz_pendentes(), registrar_maisfeliz(uuid, int), resumo_maisfeliz() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function maisfeliz_pendentes(), registrar_maisfeliz(uuid, int), resumo_maisfeliz() to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function maisfeliz_pendentes(), registrar_maisfeliz(uuid, int), resumo_maisfeliz() from anon';
  end if;
end $$;
