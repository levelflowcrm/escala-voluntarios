-- =============================================================================
-- Sininho de comunicados: guarda, para cada pessoa, até quando ela já viu os
-- comunicados. O número em vermelho = comunicados criados depois disso.
-- Só adiciona uma tabela nova.
-- =============================================================================
create table leituras_comunicados (
  pessoa_id  uuid primary key references pessoas(id) on delete cascade,
  visto_em   timestamptz not null default now()
);

alter table leituras_comunicados enable row level security;

create policy propria on leituras_comunicados for all
  using (pessoa_id = minha_pessoa()) with check (pessoa_id = minha_pessoa());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on leituras_comunicados from anon';
  end if;
end $$;
