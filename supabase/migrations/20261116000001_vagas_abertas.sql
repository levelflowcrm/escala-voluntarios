-- =============================================================================
-- Vagas abertas: quando alguém recusa, a data volta para o mural e qualquer
-- voluntário apto pode assumir — sem o coordenador precisar caçar substituto.
--
-- Nada muda para quem já usa o app: só entram duas funções novas.
--   vagas_abertas()            -> lista o que EU posso assumir
--   assumir_vaga(evento, func) -> assume a vaga (volta como "confirmado")
-- As duas rodam com as mesmas regras (função interna pode_assumir_vaga).
-- =============================================================================

-- Regras de quem pode assumir uma vaga (interna; não é exposta ao app)
create function pode_assumir_vaga(p_pessoa uuid, p_evento uuid, p_funcao uuid)
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
      -- sem bloqueio (viagem etc.) nesse dia
      and not exists (select 1 from bloqueios b
                      where b.pessoa_id = p_pessoa
                        and a.local_ts::date between b.inicio and b.fim)
      -- disponível nesse turno
      and not exists (select 1 from indisponibilidades i
                      where i.pessoa_id = p_pessoa
                        and i.dia_semana = extract(dow from a.local_ts)::int
                        and (i.periodo is null or i.periodo::text = case
                              when extract(hour from a.local_ts) < 12 then 'manha'
                              when extract(hour from a.local_ts) < 18 then 'tarde'
                              else 'noite' end)
                        and (i.ordem_no_mes is null
                             or i.ordem_no_mes = ceil(extract(day from a.local_ts) / 7.0)::int))
  )
$$;
revoke all on function pode_assumir_vaga(uuid, uuid, uuid) from public;

-- O mural: vagas que EU posso assumir, da mais próxima para a mais distante
create function vagas_abertas()
returns table (
  evento_id uuid, funcao_id uuid, titulo text, inicio timestamptz,
  funcao text, ministerio text, recusou text
)
language sql stable security definer set search_path = public as $$
  select distinct on (e.evento_id, e.funcao_id)
         e.evento_id, e.funcao_id, ev.titulo, ev.inicio, f.nome, m.nome, p.nome
  from escalas e
  join eventos ev on ev.id = e.evento_id
  join funcoes f on f.id = e.funcao_id
  join ministerios m on m.id = e.ministerio_id
  join pessoas p on p.id = e.pessoa_id
  where e.status = 'recusado' and e.papel = 'titular' and ev.inicio > now()
    and minha_pessoa() is not null
    and pode_assumir_vaga(minha_pessoa(), e.evento_id, e.funcao_id)
  order by e.evento_id, e.funcao_id, e.respondido_em desc nulls last
$$;
revoke all on function vagas_abertas() from public;

-- Assumir: a pessoa entra como titular já confirmado
create function assumir_vaga(p_evento uuid, p_funcao uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := minha_pessoa();
  novo uuid;
  mid uuid;
begin
  if eu is null then raise exception 'Você não está cadastrado(a) nesta igreja'; end if;
  if not pode_assumir_vaga(eu, p_evento, p_funcao) then
    raise exception 'Essa vaga não está mais disponível para você';
  end if;
  select ministerio_id into mid from funcoes where id = p_funcao;
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, papel, status, respondido_em)
  values (p_evento, mid, p_funcao, eu, 'titular', 'confirmado', now())
  returning id into novo;
  return novo;
exception when unique_violation then
  raise exception 'Essa vaga já foi assumida por outra pessoa';
end $$;
revoke all on function assumir_vaga(uuid, uuid) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function vagas_abertas() to authenticated';
    execute 'grant execute on function assumir_vaga(uuid, uuid) to authenticated';
  end if;
end $$;
