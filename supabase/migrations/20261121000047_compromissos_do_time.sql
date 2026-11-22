-- =============================================================================
-- Compromissos do time: reunião on-line, reunião presencial, ensaio,
-- confraternização e treinamento marcados pelo FACILITADOR para o próprio ministério.
--
--   * NÃO fazem parte do calendário oficial da igreja: ficam numa tabela própria,
--     fora de `eventos` (Agenda, métricas, sugestão de escala e lembretes não os veem).
--   * Só os membros do ministério enxergam; só o facilitador do ministério cria,
--     altera e cancela (apaga).
--   * No app aparecem em amarelo pastel, junto das escalas de quem é do time.
-- =============================================================================
create table compromissos_time (
  id             uuid primary key default gen_random_uuid(),
  igreja_id      uuid not null default minha_igreja() references igrejas(id) on delete cascade,
  ministerio_id  uuid not null references ministerios(id) on delete cascade,
  tipo           text not null check (tipo in ('reuniao_online', 'reuniao_presencial', 'ensaio', 'confraternizacao', 'treinamento')),
  inicio         timestamptz not null,
  local          text check (local is null or length(local) <= 300),       -- endereço ou link da reunião
  observacao     text check (observacao is null or length(observacao) <= 1000),
  criado_por     uuid references pessoas(id) on delete set null,
  criado_em      timestamptz not null default now()
);
create index compromissos_time_por_ministerio on compromissos_time (ministerio_id, inicio);

alter table compromissos_time enable row level security;

-- Vê: quem é do ministério (e o facilitador / administrador que coordena)
create policy leitura on compromissos_time for select using (
  igreja_id = minha_igreja()
  and (sou_coordenador(ministerio_id)
       or exists (select 1 from membros_ministerio mm
                  where mm.ministerio_id = compromissos_time.ministerio_id and mm.pessoa_id = minha_pessoa())));

-- Cria: só o facilitador do ministério, em nome de si mesmo
create policy facilitador_cria on compromissos_time for insert with check (
  igreja_id = minha_igreja()
  and sou_coordenador(ministerio_id)
  and criado_por = minha_pessoa()
  and exists (select 1 from ministerios m where m.id = ministerio_id and m.igreja_id = minha_igreja()));

-- Altera e cancela: só o facilitador do ministério (sem trocar o compromisso de ministério)
create policy facilitador_altera on compromissos_time for update
  using (igreja_id = minha_igreja() and sou_coordenador(ministerio_id))
  with check (igreja_id = minha_igreja() and sou_coordenador(ministerio_id));
create policy facilitador_cancela on compromissos_time for delete
  using (igreja_id = minha_igreja() and sou_coordenador(ministerio_id));

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on compromissos_time from anon';
  end if;
end $$;
