-- =============================================================================
-- Cultos fixos editáveis e pausas.
--   * eventos.ocorrencia: o dia do culto fixo para o qual o evento foi gerado.
--     Assim, mudar o horário/dia de UM culto não faz o gerador recriá-lo.
--   * pausas_cultos: períodos (ou um único dia) em que um culto fixo — ou todos —
--     não acontece. O gerador de cultos do mês pula esses dias.
-- =============================================================================
alter table eventos add column ocorrencia date;
update eventos set ocorrencia = (inicio at time zone 'America/Sao_Paulo')::date where tipo_evento_id is not null;
create index eventos_tipo_ocorrencia on eventos (tipo_evento_id, ocorrencia);

create table pausas_cultos (
  id             uuid primary key default gen_random_uuid(),
  igreja_id      uuid not null references igrejas(id) on delete cascade,
  tipo_evento_id uuid references tipos_evento(id) on delete cascade,  -- null = todos os cultos fixos
  de             date not null,
  ate            date not null,
  motivo         text check (char_length(motivo) <= 200),
  criado_em      timestamptz not null default now(),
  check (ate >= de)
);
create index on pausas_cultos (igreja_id, ate);

alter table pausas_cultos enable row level security;
create policy leitura on pausas_cultos for select using (igreja_id = minha_igreja());
create policy coordenador on pausas_cultos for all
  using (igreja_id = minha_igreja() and sou_coordenador_algum())
  with check (igreja_id = minha_igreja() and sou_coordenador_algum());
