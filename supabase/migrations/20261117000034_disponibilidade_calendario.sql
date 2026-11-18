-- =============================================================================
-- Disponibilidade com calendário: o voluntário marca os dias em que PODE servir.
--   * dias_disponiveis: dias marcados no calendário (valem acima da regra semanal).
--   * preferencias.so_dias_marcados: "só sirvo nos dias que eu marcar".
--   * disponivel_no_momento(): regra única usada pelas vagas, trocas e avisos:
--       1) bloqueio (viagem etc.) no dia  -> indisponível
--       2) dia marcado no calendário      -> disponível (ignora a regra semanal)
--       3) "só nos dias marcados" ligado  -> indisponível
--       4) senão vale a regra semanal (indisponibilidades)
-- =============================================================================
create table dias_disponiveis (
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  dia date not null,
  criado_em timestamptz not null default now(),
  primary key (pessoa_id, dia)
);
alter table dias_disponiveis enable row level security;
create policy leitura on dias_disponiveis for select using (pessoa_id = minha_pessoa() or sou_coordenador_algum());
create policy propria on dias_disponiveis for all
  using (pessoa_id = minha_pessoa()) with check (pessoa_id = minha_pessoa());

alter table preferencias add column so_dias_marcados boolean not null default false;

create function disponivel_no_momento(p_pessoa uuid, p_local timestamp)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    not exists (select 1 from bloqueios b where b.pessoa_id = p_pessoa and p_local::date between b.inicio and b.fim)
    and (
      exists (select 1 from dias_disponiveis d where d.pessoa_id = p_pessoa and d.dia = p_local::date)
      or (
        not coalesce((select pr.so_dias_marcados from preferencias pr where pr.pessoa_id = p_pessoa), false)
        and not exists (select 1 from indisponibilidades i
                        where i.pessoa_id = p_pessoa
                          and i.dia_semana = extract(dow from p_local)::int
                          and (i.periodo is null or i.periodo::text = case
                                when extract(hour from p_local) < 12 then 'manha'
                                when extract(hour from p_local) < 18 then 'tarde'
                                else 'noite' end)
                          and (i.ordem_no_mes is null
                               or i.ordem_no_mes = ceil(extract(day from p_local) / 7.0)::int))
      )
    )
$$;
revoke all on function disponivel_no_momento(uuid, timestamp) from public, authenticated, anon;

create or replace function pode_assumir_vaga(p_pessoa uuid, p_evento uuid, p_funcao uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  with alvo as (
    select ev.id as evento_id, ev.inicio, f.id as funcao_id, f.ministerio_id,
           (ev.inicio at time zone 'America/Sao_Paulo') as local_ts
    from eventos ev, funcoes f
    where ev.id = p_evento and f.id = p_funcao and f.ativo
  )
  select exists (
    select 1 from alvo a
    where a.inicio > now()
      -- escala publicada pelo coordenador
      and exists (select 1 from escalas_ministerio em
                  where em.evento_id = a.evento_id and em.ministerio_id = a.ministerio_id and em.publicada)
      -- a vaga está mesmo livre (houve recusa e ninguém ocupa)
      and exists (select 1 from escalas e
                  where e.evento_id = a.evento_id and e.funcao_id = a.funcao_id
                    and e.papel = 'titular' and e.status = 'recusado')
      and not exists (select 1 from escalas e
                      where e.evento_id = a.evento_id and e.funcao_id = a.funcao_id
                        and e.papel = 'titular' and e.status in ('pendente', 'confirmado'))
      -- ministério sem responsável do dia fixo
      and not exists (select 1 from escalas e
                      where e.evento_id = a.evento_id and e.ministerio_id = a.ministerio_id
                        and e.papel = 'responsavel_dia' and e.status in ('pendente', 'confirmado'))
      -- pessoa ativa, da mesma igreja, membro do ministério e apta na função
      and exists (select 1 from pessoas p
                  join eventos ev on ev.id = a.evento_id
                  where p.id = p_pessoa and p.ativo and p.igreja_id = ev.igreja_id)
      and exists (select 1 from membros_ministerio mm
                  where mm.pessoa_id = p_pessoa and mm.ministerio_id = a.ministerio_id)
      and exists (select 1 from habilitacoes h
                  where h.pessoa_id = p_pessoa and h.funcao_id = a.funcao_id and h.nivel = 'apto')
      -- não está fazendo outra coisa neste evento
      and not exists (select 1 from escalas e
                      where e.evento_id = a.evento_id and e.pessoa_id = p_pessoa
                        and e.status in ('pendente', 'confirmado'))
      -- não foi quem recusou esta vaga
      and not exists (select 1 from escalas e
                      where e.evento_id = a.evento_id and e.funcao_id = a.funcao_id
                        and e.pessoa_id = p_pessoa and e.status = 'recusado')
      -- bloqueios, dias marcados no calendário e indisponibilidade semanal
      and disponivel_no_momento(p_pessoa, a.local_ts)
  )
$$;

create or replace function pode_cobrir(p_pessoa uuid, p_escala uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  with alvo as (
    select e.id, e.evento_id, e.funcao_id, e.ministerio_id, e.pessoa_id as dono, ev.inicio, ev.igreja_id,
           (ev.inicio at time zone 'America/Sao_Paulo') as local_ts
    from escalas e join eventos ev on ev.id = e.evento_id
    where e.id = p_escala and e.papel = 'titular' and e.funcao_id is not null
      and e.status in ('pendente', 'confirmado')
  )
  select exists (
    select 1 from alvo a
    where a.inicio > now()
      and a.dono <> p_pessoa
      and exists (select 1 from escalas_ministerio em
                  where em.evento_id = a.evento_id and em.ministerio_id = a.ministerio_id and em.publicada)
      and exists (select 1 from pessoas p where p.id = p_pessoa and p.ativo and p.igreja_id = a.igreja_id)
      and exists (select 1 from membros_ministerio mm
                  where mm.pessoa_id = p_pessoa and mm.ministerio_id = a.ministerio_id)
      and exists (select 1 from habilitacoes h
                  where h.pessoa_id = p_pessoa and h.funcao_id = a.funcao_id and h.nivel = 'apto')
      and not exists (select 1 from escalas e
                      where e.evento_id = a.evento_id and e.pessoa_id = p_pessoa
                        and e.status in ('pendente', 'confirmado'))
      -- bloqueios, dias marcados no calendário e indisponibilidade semanal
      and disponivel_no_momento(p_pessoa, a.local_ts)
  )
$$;
