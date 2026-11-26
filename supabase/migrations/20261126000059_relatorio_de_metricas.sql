-- =============================================================================
-- Relatório das métricas por WhatsApp (PDF).
--   * metricas_destinatarios: quem recebe o relatório (nome + celular), editado só por administradores.
--   * metricas_relatorios: registro de cada envio (evita mandar o mesmo PDF sem querer e mostra "enviado em").
-- Só administradores leem e gravam (mesma regra do painel de métricas).
-- =============================================================================
create table metricas_destinatarios (
  id         uuid primary key default gen_random_uuid(),
  igreja_id  uuid not null references igrejas(id) on delete cascade,
  nome       text not null check (length(btrim(nome)) between 1 and 80),
  celular    text not null check (length(btrim(celular)) between 8 and 30),
  criado_em  timestamptz not null default now(),
  unique (igreja_id, celular)
);

create table metricas_relatorios (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references eventos(id) on delete cascade,
  igreja_id      uuid not null references igrejas(id) on delete cascade,
  enviado_em     timestamptz not null default now(),
  enviado_por    uuid references pessoas(id) on delete set null,
  destinatarios  int not null default 0,
  falhas         int not null default 0
);
create index metricas_relatorios_evento on metricas_relatorios (evento_id, enviado_em desc);

alter table metricas_destinatarios enable row level security;
alter table metricas_relatorios enable row level security;

create policy metricas_destinatarios_admin on metricas_destinatarios for all to authenticated
  using (igreja_id = minha_igreja() and pode_ver_metricas())
  with check (igreja_id = minha_igreja() and pode_ver_metricas());

create policy metricas_relatorios_leitura on metricas_relatorios for select to authenticated
  using (igreja_id = minha_igreja() and pode_ver_metricas());
create policy metricas_relatorios_gravacao on metricas_relatorios for insert to authenticated
  with check (igreja_id = minha_igreja() and pode_ver_metricas());

revoke all on metricas_destinatarios, metricas_relatorios from anon;
