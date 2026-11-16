-- =============================================================================
-- Comunicados: o coordenador publica um aviso para o time do ministério e os
-- voluntários veem na tela inicial. Só adiciona uma tabela nova.
-- =============================================================================
create table comunicados (
  id             uuid primary key default gen_random_uuid(),
  ministerio_id  uuid not null references ministerios(id) on delete cascade,
  autor_id       uuid references pessoas(id) on delete set null,
  titulo         text not null check (length(trim(titulo)) between 1 and 120),
  texto          text not null check (length(trim(texto)) between 1 and 2000),
  criado_em      timestamptz not null default now()
);
create index comunicados_por_ministerio on comunicados (ministerio_id, criado_em desc);

alter table comunicados enable row level security;

-- Lê quem é do ministério (ou coordena) — sempre dentro da própria igreja
create policy leitura on comunicados for select using (
  ministerio_id in (select id from ministerios where igreja_id = minha_igreja())
  and (
    sou_coordenador(ministerio_id)
    or exists (select 1 from membros_ministerio mm
               where mm.ministerio_id = comunicados.ministerio_id and mm.pessoa_id = minha_pessoa())
  ));

-- Só o coordenador do ministério publica e apaga; o autor é sempre ele mesmo
create policy coordenador_publica on comunicados for insert
  with check (sou_coordenador(ministerio_id) and autor_id = minha_pessoa());
create policy coordenador_apaga on comunicados for delete using (sou_coordenador(ministerio_id));
create policy coordenador_edita on comunicados for update
  using (sou_coordenador(ministerio_id)) with check (sou_coordenador(ministerio_id) and autor_id = minha_pessoa());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on comunicados from anon';
  end if;
end $$;
