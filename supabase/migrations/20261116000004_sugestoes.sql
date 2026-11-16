-- =============================================================================
-- Sugestões: o voluntário manda ideias/feedback ao coordenador do ministério,
-- com a opção de enviar sem se identificar. Só adiciona uma tabela nova.
-- =============================================================================
create type status_sugestao as enum ('nova', 'vista', 'aplicada');

create table sugestoes (
  id             uuid primary key default gen_random_uuid(),
  ministerio_id  uuid not null references ministerios(id) on delete cascade,
  autor_id       uuid references pessoas(id) on delete set null,  -- nulo quando anônima
  anonima        boolean not null default false,
  texto          text not null check (length(trim(texto)) between 1 and 1000),
  status         status_sugestao not null default 'nova',
  criado_em      timestamptz not null default now(),
  check (not anonima or autor_id is null)
);
create index sugestoes_por_ministerio on sugestoes (ministerio_id, criado_em desc);

alter table sugestoes enable row level security;

-- Vê: o coordenador do ministério e o próprio autor (sugestão anônima não tem autor)
create policy leitura on sugestoes for select using (
  ministerio_id in (select id from ministerios where igreja_id = minha_igreja())
  and (sou_coordenador(ministerio_id) or autor_id = minha_pessoa()));

-- Envia: quem é do ministério, identificado como si mesmo ou anônimo de verdade
create policy envia on sugestoes for insert with check (
  status = 'nova'
  and exists (select 1 from membros_ministerio mm
              where mm.ministerio_id = sugestoes.ministerio_id and mm.pessoa_id = minha_pessoa())
  and ((anonima and autor_id is null) or (not anonima and autor_id = minha_pessoa())));

-- Coordenador acompanha (vista / aplicada) e apaga
create policy coordenador_atualiza on sugestoes for update
  using (sou_coordenador(ministerio_id)) with check (sou_coordenador(ministerio_id));
create policy coordenador_apaga on sugestoes for delete using (sou_coordenador(ministerio_id));

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on sugestoes from anon';
  end if;
end $$;
