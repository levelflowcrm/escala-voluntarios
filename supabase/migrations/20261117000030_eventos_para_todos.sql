-- =============================================================================
-- Eventos para todos + dispensa por ministério + só o master cria eventos.
--
--  * Todo evento entra na Agenda da igreja E no Montar escala de todos os ministérios.
--    Os antigos eventos "só agenda" viram eventos normais.
--  * Cada coordenador pode DISPENSAR um evento para o próprio ministério (ex.: Iluminação
--    não serve numa reunião de líderes). Dispensado, o evento some da escala dele; dá para
--    voltar atrás. O banco impede escalar gente num evento dispensado.
--  * Criar, alterar, apagar eventos, cultos fixos e pausas: SOMENTE o administrador master.
--    Coordenadores continuam montando a escala e dispensando eventos do ministério deles.
-- =============================================================================

-- 1) Os eventos "só agenda" passam a valer também para a escala
update eventos set so_agenda = false where so_agenda;

-- 2) Dispensa de um evento por ministério
create table eventos_dispensados (
  evento_id     uuid not null references eventos(id) on delete cascade,
  ministerio_id uuid not null references ministerios(id) on delete cascade,
  criado_em     timestamptz not null default now(),
  primary key (evento_id, ministerio_id)
);
alter table eventos_dispensados enable row level security;
create policy leitura on eventos_dispensados for select using (
  exists (select 1 from eventos e where e.id = evento_id and e.igreja_id = minha_igreja())
);
-- Sem políticas de escrita: só a função abaixo mexe nesta tabela.

create function dispensar_evento(p_evento uuid, p_ministerio uuid, p_dispensar boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not sou_coordenador(p_ministerio) then
    raise exception 'Só o coordenador do ministério pode fazer isso';
  end if;
  if not exists (select 1 from eventos where id = p_evento and igreja_id = minha_igreja()) then
    raise exception 'Evento não encontrado';
  end if;

  if p_dispensar then
    if exists (select 1 from escalas where evento_id = p_evento and ministerio_id = p_ministerio and status in ('pendente', 'confirmado')) then
      raise exception 'Este ministério já tem gente escalada neste evento. Tire as pessoas da escala antes de dispensar.';
    end if;
    delete from escalas where evento_id = p_evento and ministerio_id = p_ministerio;
    delete from escalas_ministerio where evento_id = p_evento and ministerio_id = p_ministerio;
    insert into eventos_dispensados (evento_id, ministerio_id) values (p_evento, p_ministerio) on conflict do nothing;
  else
    delete from eventos_dispensados where evento_id = p_evento and ministerio_id = p_ministerio;
  end if;
end $$;
revoke all on function dispensar_evento(uuid, uuid, boolean) from public, anon;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function dispensar_evento(uuid, uuid, boolean) to authenticated';
  end if;
end $$;

-- Rede de segurança: ninguém é escalado num evento que o ministério dispensou
create function tg_bloqueia_escala_dispensada()
returns trigger
language plpgsql as $$
begin
  if exists (select 1 from eventos_dispensados d where d.evento_id = new.evento_id and d.ministerio_id = new.ministerio_id) then
    raise exception 'Este ministério dispensou este evento';
  end if;
  return new;
end $$;
create trigger escala_dispensada before insert on escalas
  for each row execute function tg_bloqueia_escala_dispensada();

-- 3) Só o master mexe em eventos, cultos fixos e pausas (coordenador e outros administradores só leem)
drop policy coordenador on eventos;
drop policy administrador on eventos;
create policy master on eventos for all
  using (igreja_id = minha_igreja() and sou_admin_master())
  with check (igreja_id = minha_igreja() and sou_admin_master());

drop policy coordenador on tipos_evento;
create policy master on tipos_evento for all
  using (igreja_id = minha_igreja() and sou_admin_master())
  with check (igreja_id = minha_igreja() and sou_admin_master());

drop policy coordenador on pausas_cultos;
create policy master on pausas_cultos for all
  using (igreja_id = minha_igreja() and sou_admin_master())
  with check (igreja_id = minha_igreja() and sou_admin_master());

-- 4) Quem já está escalado em OUTRO ministério (o coordenador B enxerga que o A já escalou a pessoa).
--    Só coordenadores; devolve o nome do ministério, inclusive de escalas ainda em rascunho.
--    A duplicidade continua barrada no banco (índice escalas_uma_coisa_por_evento).
create function escalados_no_periodo(p_inicio timestamptz, p_fim timestamptz)
returns table (evento_id uuid, pessoa_id uuid, ministerio_id uuid, ministerio text)
language sql stable security definer set search_path = public as $$
  select distinct e.evento_id, e.pessoa_id, e.ministerio_id, m.nome
  from escalas e
  join eventos ev on ev.id = e.evento_id
  join ministerios m on m.id = e.ministerio_id
  where sou_coordenador_algum()
    and ev.igreja_id = minha_igreja()
    and ev.inicio >= p_inicio and ev.inicio < p_fim
    and e.status in ('pendente', 'confirmado')
$$;
revoke all on function escalados_no_periodo(timestamptz, timestamptz) from public, anon;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function escalados_no_periodo(timestamptz, timestamptz) to authenticated';
  end if;
end $$;
