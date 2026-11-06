-- =============================================================================
-- Escala de Voluntários — estrutura inicial
--
-- Regras de negócio refletidas aqui (confirmadas com o coordenador):
--   * 1 pessoa por função em cada evento (titular).
--   * A mesma pessoa NÃO faz mais de uma coisa no mesmo evento, em nenhum
--     ministério (índice único evento + pessoa).
--   * "Apoio": segunda pessoa numa função — acompanhante de treinamento ou
--     reforço em dias intensos.
--   * "Responsável do dia": quando uma pessoa opera o ministério inteiro sozinha
--     naquele evento. Ocupa uma linha só (sem função), e o ministério não recebe
--     titulares nesse evento.
--   * Cada ministério tem seu coordenador.
--   * Tudo tem igreja_id desde já, para no futuro atender várias igrejas.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type papel_ministerio   as enum ('coordenador', 'voluntario');
create type nivel_habilitacao  as enum ('aprendiz', 'apto');
create type papel_escala       as enum ('titular', 'apoio', 'treinamento', 'responsavel_dia');
create type status_escala      as enum ('pendente', 'confirmado', 'recusado', 'trocado');
create type periodo_dia        as enum ('manha', 'tarde', 'noite');

-- ---------------------------------------------------------------------------
-- Igreja, ministérios e funções
-- ---------------------------------------------------------------------------
create table igrejas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  slug       text not null unique,
  fuso       text not null default 'America/Sao_Paulo',
  criado_em  timestamptz not null default now()
);

create table ministerios (
  id         uuid primary key default gen_random_uuid(),
  igreja_id  uuid not null references igrejas(id) on delete cascade,
  nome       text not null,
  cor        text,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now(),
  unique (igreja_id, nome)
);

create table funcoes (
  id             uuid primary key default gen_random_uuid(),
  ministerio_id  uuid not null references ministerios(id) on delete cascade,
  nome           text not null,
  ordem          smallint not null default 0,
  ativo          boolean not null default true,
  unique (ministerio_id, nome)
);

-- ---------------------------------------------------------------------------
-- Pessoas
-- ---------------------------------------------------------------------------
create table pessoas (
  id            uuid primary key default gen_random_uuid(),
  igreja_id     uuid not null references igrejas(id) on delete cascade,
  auth_user_id  uuid unique,             -- preenchido quando a pessoa faz o 1º login
  nome          text not null,           -- como aparece na escala ("Rodrigo Digão")
  nome_completo text,
  email         text,
  celular       text,
  aniversario   date,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  unique (igreja_id, nome)
);

-- Participação da pessoa em cada ministério
create table membros_ministerio (
  pessoa_id      uuid not null references pessoas(id) on delete cascade,
  ministerio_id  uuid not null references ministerios(id) on delete cascade,
  papel          papel_ministerio not null default 'voluntario',
  -- Consegue operar o ministério inteiro sozinho ("responsável do dia")
  pode_responsavel_dia boolean not null default false,
  desde          date not null default current_date,
  primary key (pessoa_id, ministerio_id)
);

-- Quais funções a pessoa sabe operar
create table habilitacoes (
  pessoa_id   uuid not null references pessoas(id) on delete cascade,
  funcao_id   uuid not null references funcoes(id) on delete cascade,
  nivel       nivel_habilitacao not null default 'apto',
  atualizado_em timestamptz not null default now(),
  primary key (pessoa_id, funcao_id)
);

-- ---------------------------------------------------------------------------
-- Disponibilidade
-- ---------------------------------------------------------------------------
-- Turnos em que a pessoa NÃO pode servir (padrão: pode tudo).
-- ordem_no_mes nula  = toda semana (ex.: "não posso quarta à noite")
-- ordem_no_mes 1..5  = só naquela ocorrência (ex.: "não sirvo no 1º domingo")
-- periodo nulo       = o dia inteiro
create table indisponibilidades (
  id            uuid primary key default gen_random_uuid(),
  pessoa_id     uuid not null references pessoas(id) on delete cascade,
  dia_semana    smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  periodo       periodo_dia,
  ordem_no_mes  smallint check (ordem_no_mes between 1 and 5),
  criado_em     timestamptz not null default now()
);

-- Bloqueios por período (viagem, plantão, saúde...)
create table bloqueios (
  id         uuid primary key default gen_random_uuid(),
  pessoa_id  uuid not null references pessoas(id) on delete cascade,
  inicio     date not null,
  fim        date not null,
  motivo     text,
  criado_em  timestamptz not null default now(),
  check (fim >= inicio)
);

-- ---------------------------------------------------------------------------
-- Eventos
-- ---------------------------------------------------------------------------
-- Modelos de evento (cultos fixos e especiais). Os recorrentes geram o mês.
create table tipos_evento (
  id          uuid primary key default gen_random_uuid(),
  igreja_id   uuid not null references igrejas(id) on delete cascade,
  nome        text not null,
  dia_semana  smallint check (dia_semana between 0 and 6),  -- preenchido = recorrente
  hora        time,
  ativo       boolean not null default true,
  unique (igreja_id, nome)
);

create table eventos (
  id               uuid primary key default gen_random_uuid(),
  igreja_id        uuid not null references igrejas(id) on delete cascade,
  tipo_evento_id   uuid references tipos_evento(id) on delete set null,
  titulo           text not null,
  inicio           timestamptz not null,
  observacao       text,
  -- Reuniões/alinhamentos em que "todos" são convocados
  convocacao_geral boolean not null default false,
  -- Dia intenso: permite a mesma pessoa em mais de um evento no dia sem alerta
  intensivo        boolean not null default false,
  criado_em        timestamptz not null default now()
);
create index on eventos (igreja_id, inicio);

-- Situação da escala de cada ministério em cada evento
create table escalas_ministerio (
  evento_id      uuid not null references eventos(id) on delete cascade,
  ministerio_id  uuid not null references ministerios(id) on delete cascade,
  publicada      boolean not null default false,  -- rascunho até o coordenador publicar
  publicada_em   timestamptz,
  primary key (evento_id, ministerio_id)
);

-- Quem serve em quê
create table escalas (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references eventos(id) on delete cascade,
  ministerio_id  uuid not null references ministerios(id) on delete cascade,
  funcao_id      uuid references funcoes(id) on delete cascade,
  pessoa_id      uuid not null references pessoas(id) on delete cascade,
  papel          papel_escala not null default 'titular',
  status         status_escala not null default 'pendente',
  motivo         text,
  respondido_em  timestamptz,
  criado_em      timestamptz not null default now(),
  -- responsável do dia não tem função; os demais papéis têm
  check ((papel = 'responsavel_dia') = (funcao_id is null))
);

-- Uma pessoa faz UMA coisa por evento (em qualquer ministério)
create unique index escalas_uma_coisa_por_evento
  on escalas (evento_id, pessoa_id)
  where status in ('pendente', 'confirmado');

-- Um titular por função em cada evento
create unique index escalas_um_titular_por_funcao
  on escalas (evento_id, funcao_id)
  where papel = 'titular' and status in ('pendente', 'confirmado');

-- Um responsável do dia por ministério em cada evento
create unique index escalas_um_responsavel_por_ministerio
  on escalas (evento_id, ministerio_id)
  where papel = 'responsavel_dia' and status in ('pendente', 'confirmado');

create index on escalas (pessoa_id);

-- A função precisa pertencer ao ministério da escala; responsável do dia e
-- titulares não convivem no mesmo ministério/evento.
create function validar_escala() returns trigger
language plpgsql as $$
begin
  if new.funcao_id is not null and not exists (
    select 1 from funcoes f where f.id = new.funcao_id and f.ministerio_id = new.ministerio_id
  ) then
    raise exception 'A função não pertence a este ministério';
  end if;

  if new.status in ('pendente', 'confirmado') then
    if new.papel = 'responsavel_dia' and exists (
      select 1 from escalas e
      where e.evento_id = new.evento_id and e.ministerio_id = new.ministerio_id
        and e.papel = 'titular' and e.status in ('pendente', 'confirmado') and e.id <> new.id
    ) then
      raise exception 'Este ministério já tem titulares neste evento; remova-os antes de definir um responsável do dia';
    end if;

    if new.papel = 'titular' and exists (
      select 1 from escalas e
      where e.evento_id = new.evento_id and e.ministerio_id = new.ministerio_id
        and e.papel = 'responsavel_dia' and e.status in ('pendente', 'confirmado') and e.id <> new.id
    ) then
      raise exception 'Este ministério tem um responsável do dia neste evento';
    end if;
  end if;
  return new;
end $$;

create trigger escalas_validar
  before insert or update on escalas
  for each row execute function validar_escala();

-- ---------------------------------------------------------------------------
-- Visão de carga: base para a sugestão automática e para o painel
-- ---------------------------------------------------------------------------
create view carga_voluntarios as
select
  p.id   as pessoa_id,
  p.igreja_id,
  p.nome,
  count(e.id) filter (where ev.inicio >= now() - interval '90 days' and ev.inicio < now()) as servicos_90d,
  count(e.id) filter (where date_trunc('month', ev.inicio) = date_trunc('month', now()))  as servicos_mes,
  max(ev.inicio) filter (where ev.inicio < now()) as ultimo_servico
from pessoas p
left join escalas e  on e.pessoa_id = p.id and e.status in ('pendente', 'confirmado')
left join eventos ev on ev.id = e.evento_id
where p.ativo
group by p.id;

-- ---------------------------------------------------------------------------
-- Segurança (Row Level Security)
-- ---------------------------------------------------------------------------
create function minha_pessoa() returns uuid
language sql stable security definer set search_path = public as $$
  select id from pessoas where auth_user_id = auth.uid()
$$;

create function minha_igreja() returns uuid
language sql stable security definer set search_path = public as $$
  select igreja_id from pessoas where auth_user_id = auth.uid()
$$;

create function sou_coordenador(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros_ministerio mm
    where mm.ministerio_id = m and mm.pessoa_id = minha_pessoa() and mm.papel = 'coordenador'
  )
$$;

create function sou_coordenador_algum() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membros_ministerio mm
    where mm.pessoa_id = minha_pessoa() and mm.papel = 'coordenador'
  )
$$;

alter table igrejas            enable row level security;
alter table ministerios        enable row level security;
alter table funcoes            enable row level security;
alter table pessoas            enable row level security;
alter table membros_ministerio enable row level security;
alter table habilitacoes       enable row level security;
alter table indisponibilidades enable row level security;
alter table bloqueios          enable row level security;
alter table tipos_evento       enable row level security;
alter table eventos            enable row level security;
alter table escalas_ministerio enable row level security;
alter table escalas            enable row level security;

-- Leitura: todos da igreja enxergam a estrutura e as escalas
create policy leitura on igrejas     for select using (id = minha_igreja());
create policy leitura on ministerios for select using (igreja_id = minha_igreja());
create policy leitura on funcoes     for select using (
  ministerio_id in (select id from ministerios where igreja_id = minha_igreja()));
create policy leitura on pessoas     for select using (igreja_id = minha_igreja());
create policy leitura on membros_ministerio for select using (
  ministerio_id in (select id from ministerios where igreja_id = minha_igreja()));
create policy leitura on habilitacoes for select using (
  pessoa_id in (select id from pessoas where igreja_id = minha_igreja()));
create policy leitura on tipos_evento for select using (igreja_id = minha_igreja());
create policy leitura on eventos      for select using (igreja_id = minha_igreja());
create policy leitura on escalas_ministerio for select using (
  sou_coordenador(ministerio_id) or publicada);
-- Rascunho só o coordenador vê; publicada, todos veem
create policy leitura on escalas for select using (
  sou_coordenador(ministerio_id)
  or exists (select 1 from escalas_ministerio em
             where em.evento_id = escalas.evento_id
               and em.ministerio_id = escalas.ministerio_id and em.publicada));

-- Disponibilidade: a própria pessoa e os coordenadores
create policy leitura on indisponibilidades for select using (
  pessoa_id = minha_pessoa() or sou_coordenador_algum());
create policy leitura on bloqueios for select using (
  pessoa_id = minha_pessoa() or sou_coordenador_algum());
create policy propria on indisponibilidades for all
  using (pessoa_id = minha_pessoa()) with check (pessoa_id = minha_pessoa());
create policy propria on bloqueios for all
  using (pessoa_id = minha_pessoa()) with check (pessoa_id = minha_pessoa());

-- O voluntário edita os próprios dados de contato
create policy propria on pessoas for update
  using (id = minha_pessoa()) with check (id = minha_pessoa());

-- Coordenadores gerenciam pessoas, eventos e a escala do próprio ministério
create policy coordenador on pessoas for all
  using (igreja_id = minha_igreja() and sou_coordenador_algum())
  with check (igreja_id = minha_igreja() and sou_coordenador_algum());
create policy coordenador on membros_ministerio for all
  using (sou_coordenador(ministerio_id)) with check (sou_coordenador(ministerio_id));
create policy coordenador on habilitacoes for all
  using (sou_coordenador((select ministerio_id from funcoes where id = funcao_id)))
  with check (sou_coordenador((select ministerio_id from funcoes where id = funcao_id)));
create policy coordenador on funcoes for all
  using (sou_coordenador(ministerio_id)) with check (sou_coordenador(ministerio_id));
create policy coordenador on tipos_evento for all
  using (igreja_id = minha_igreja() and sou_coordenador_algum())
  with check (igreja_id = minha_igreja() and sou_coordenador_algum());
create policy coordenador on eventos for all
  using (igreja_id = minha_igreja() and sou_coordenador_algum())
  with check (igreja_id = minha_igreja() and sou_coordenador_algum());
create policy coordenador on escalas_ministerio for all
  using (sou_coordenador(ministerio_id)) with check (sou_coordenador(ministerio_id));
create policy coordenador on escalas for all
  using (sou_coordenador(ministerio_id)) with check (sou_coordenador(ministerio_id));

-- O voluntário só responde a própria escala (confirmar / recusar)
create function responder_escala(escala uuid, resposta status_escala, motivo_txt text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if resposta not in ('confirmado', 'recusado') then
    raise exception 'Resposta inválida';
  end if;
  update escalas
     set status = resposta, motivo = motivo_txt, respondido_em = now()
   where id = escala and pessoa_id = minha_pessoa();
  if not found then
    raise exception 'Escala não encontrada';
  end if;
end $$;
