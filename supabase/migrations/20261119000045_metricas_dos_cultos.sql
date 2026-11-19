-- =============================================================================
-- Métricas dos cultos e eventos (painel gerencial).
--   * Por evento: online (YouTube), visitantes, "Sim pra Jesus", cadeiras vazias da Nave e da
--     Galeria, carros e motos, e a contagem MANUAL de voluntários por área.
--   * Presentes = cadeiras da igreja (2055) - vazias da Nave - vazias da Galeria.
--   * Contagem AUTO de voluntários = quem apertou "Cheguei" (escalas.chegou_em).
--   * Valor em branco = "ainda não contado" (diferente de zero).
--   * Quem lança e vê: só administradores.
--   * Ninguém grava direto nas tabelas: só pela função salvar_metricas.
-- =============================================================================
create table areas_contagem (
  id         uuid primary key default gen_random_uuid(),
  igreja_id  uuid not null references igrejas(id) on delete cascade,
  nome       text not null check (length(btrim(nome)) between 1 and 60),
  ordem      smallint not null default 0,
  ativo      boolean not null default true,
  unique (igreja_id, nome)
);

create table metricas_config (
  igreja_id       uuid primary key references igrejas(id) on delete cascade,
  cadeiras_total  int not null default 2055 check (cadeiras_total > 0)
);

create table metricas_evento (
  evento_id          uuid primary key references eventos(id) on delete cascade,
  igreja_id          uuid not null references igrejas(id) on delete cascade,
  online             int check (online between 0 and 1000000),
  visitantes         int check (visitantes between 0 and 100000),
  sim_pra_jesus      int check (sim_pra_jesus between 0 and 100000),
  cadeiras_nave_vazias    int check (cadeiras_nave_vazias between 0 and 100000),
  cadeiras_galeria_vazias int check (cadeiras_galeria_vazias between 0 and 100000),
  carros             int check (carros between 0 and 100000),
  motos              int check (motos between 0 and 100000),
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid references pessoas(id) on delete set null
);

create table metricas_areas (
  evento_id  uuid not null references eventos(id) on delete cascade,
  area_id    uuid not null references areas_contagem(id) on delete cascade,
  qtd        int not null check (qtd between 0 and 10000),
  primary key (evento_id, area_id)
);

insert into areas_contagem (igreja_id, nome, ordem)
select i.id, a.nome, a.ordem from igrejas i
cross join (values ('First', 1), ('Louvor', 2), ('Intercessão', 3), ('Cozinha', 4), ('Crianças', 5),
                   ('Enfermaria', 6), ('Backstage', 7), ('Mídia', 8), ('Diaconia', 9)) as a(nome, ordem)
on conflict (igreja_id, nome) do nothing;
insert into metricas_config (igreja_id) select id from igrejas on conflict do nothing;

-- Igreja nova já nasce com as áreas e a capacidade padrão
create function metricas_padrao_da_igreja() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into metricas_config (igreja_id) values (new.id) on conflict do nothing;
  insert into areas_contagem (igreja_id, nome, ordem)
  select new.id, a.nome, a.ordem
    from (values ('First', 1), ('Louvor', 2), ('Intercessão', 3), ('Cozinha', 4), ('Crianças', 5),
                 ('Enfermaria', 6), ('Backstage', 7), ('Mídia', 8), ('Diaconia', 9)) as a(nome, ordem)
  on conflict (igreja_id, nome) do nothing;
  return new;
end $$;
create trigger igrejas_metricas_padrao after insert on igrejas
  for each row execute function metricas_padrao_da_igreja();

create function pode_ver_metricas() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(sou_admin(), false)
$$;

alter table areas_contagem enable row level security;
alter table metricas_config enable row level security;
alter table metricas_evento enable row level security;
alter table metricas_areas enable row level security;
create policy areas_contagem_leitura on areas_contagem for select to authenticated
  using (igreja_id = minha_igreja() and pode_ver_metricas());
create policy metricas_config_leitura on metricas_config for select to authenticated
  using (igreja_id = minha_igreja() and pode_ver_metricas());
create policy metricas_evento_leitura on metricas_evento for select to authenticated
  using (igreja_id = minha_igreja() and pode_ver_metricas());
create policy metricas_areas_leitura on metricas_areas for select to authenticated
  using (pode_ver_metricas() and exists (select 1 from eventos e where e.id = evento_id and e.igreja_id = minha_igreja()));

-- Grava a ficha do evento. p_dados: {online, visitantes, sim_pra_jesus, nave_vazias, galeria_vazias, carros, motos,
-- areas: [{area_id, qtd}]}. Campo ausente/nulo = não contado. Só vale a partir de 12 h antes do início.
create function salvar_metricas(p_evento uuid, p_dados jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  ig uuid := minha_igreja(); ev record; cad int; nave int; gal int; x jsonb; aid uuid; q int;
begin
  if not pode_ver_metricas() then raise exception 'Só administradores lançam as contagens'; end if;
  select id, inicio into ev from eventos where id = p_evento and igreja_id = ig;
  if not found then raise exception 'Evento não encontrado'; end if;
  if ev.inicio > now() + interval '12 hours' then raise exception 'Esse evento ainda não começou: lance a contagem no dia'; end if;
  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then raise exception 'Dados inválidos'; end if;
  select cadeiras_total into cad from metricas_config where igreja_id = ig;
  cad := coalesce(cad, 2055);
  nave := nullif(p_dados->>'nave_vazias', '')::int; gal := nullif(p_dados->>'galeria_vazias', '')::int;
  if coalesce(nave, 0) + coalesce(gal, 0) > cad then
    raise exception 'As cadeiras vazias passam do total da igreja (% cadeiras)', cad;
  end if;
  insert into metricas_evento (evento_id, igreja_id, online, visitantes, sim_pra_jesus, cadeiras_nave_vazias,
                               cadeiras_galeria_vazias, carros, motos, atualizado_em, atualizado_por)
  values (p_evento, ig, nullif(p_dados->>'online', '')::int, nullif(p_dados->>'visitantes', '')::int,
          nullif(p_dados->>'sim_pra_jesus', '')::int, nave, gal, nullif(p_dados->>'carros', '')::int,
          nullif(p_dados->>'motos', '')::int, now(), minha_pessoa())
  on conflict (evento_id) do update set online = excluded.online, visitantes = excluded.visitantes,
    sim_pra_jesus = excluded.sim_pra_jesus, cadeiras_nave_vazias = excluded.cadeiras_nave_vazias,
    cadeiras_galeria_vazias = excluded.cadeiras_galeria_vazias, carros = excluded.carros, motos = excluded.motos,
    atualizado_em = now(), atualizado_por = minha_pessoa();
  delete from metricas_areas where evento_id = p_evento;
  if jsonb_typeof(p_dados->'areas') = 'array' then
    for x in select e from jsonb_array_elements(p_dados->'areas') e loop
      if coalesce(x->>'qtd', '') = '' then continue; end if;
      aid := (x->>'area_id')::uuid; q := (x->>'qtd')::int;
      if not exists (select 1 from areas_contagem where id = aid and igreja_id = ig) then raise exception 'Área inválida'; end if;
      insert into metricas_areas (evento_id, area_id, qtd) values (p_evento, aid, q)
        on conflict (evento_id, area_id) do update set qtd = excluded.qtd;
    end loop;
  end if;
end;
$$;
revoke execute on function salvar_metricas(uuid, jsonb) from public, anon;

-- Contagem automática por evento: escalados ativos e quantos já apertaram "Cheguei"
create function metricas_auto(p_de timestamptz, p_ate timestamptz)
returns table (evento_id uuid, escalados int, presentes int)
language sql stable security definer set search_path = public as $$
  select ev.id, count(*) filter (where es.status in ('pendente', 'confirmado'))::int,
         count(*) filter (where es.chegou_em is not null and es.status in ('pendente', 'confirmado'))::int
    from eventos ev join escalas es on es.evento_id = ev.id
   where pode_ver_metricas() and ev.igreja_id = minha_igreja() and ev.inicio >= p_de and ev.inicio < p_ate
   group by ev.id
$$;
revoke execute on function metricas_auto(timestamptz, timestamptz) from public, anon;

grant execute on function pode_ver_metricas(), salvar_metricas(uuid, jsonb), metricas_auto(timestamptz, timestamptz) to authenticated;
