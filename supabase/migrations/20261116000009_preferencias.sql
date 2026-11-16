-- =============================================================================
-- Preferências do voluntário: quantas vezes por mês ele gostaria de servir no
-- máximo e um recado ao coordenador. O rodízio automático respeita o limite;
-- o coordenador continua livre para escalar manualmente.
-- =============================================================================
create table preferencias (
  pessoa_id uuid primary key references pessoas(id) on delete cascade,
  limite_mensal int check (limite_mensal between 1 and 10),
  observacao text check (char_length(observacao) <= 200),
  atualizado_em timestamptz not null default now()
);
alter table preferencias enable row level security;

create policy leitura on preferencias for select using (pessoa_id = minha_pessoa() or sou_coordenador_algum());
create policy propria on preferencias for all
  using (pessoa_id = minha_pessoa()) with check (pessoa_id = minha_pessoa());
