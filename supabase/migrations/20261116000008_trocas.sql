-- =============================================================================
-- Troca entre colegas: o voluntário que não pode servir escolhe um colega apto
-- e disponível; o colega aceita (ou recusa) pelo app e a escala muda sozinha.
-- O coordenador não precisa intermediar. Tudo passa por funções (a tabela
-- trocas não tem política de leitura direta).
-- =============================================================================

create table trocas (
  id uuid primary key default gen_random_uuid(),
  escala_id uuid not null references escalas(id) on delete cascade,
  solicitante_id uuid not null references pessoas(id),
  colega_id uuid not null references pessoas(id),
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada', 'cancelada')),
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  check (solicitante_id <> colega_id)
);
-- um pedido pendente por escala
create unique index trocas_uma_pendente on trocas (escala_id) where status = 'pendente';
create index trocas_colega on trocas (colega_id) where status = 'pendente';
alter table trocas enable row level security;
-- sem políticas: ninguém lê/escreve direto; só as funções abaixo (security definer)

-- Regras de quem pode cobrir uma escala (interna)
create function pode_cobrir(p_pessoa uuid, p_escala uuid)
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
      and not exists (select 1 from bloqueios b
                      where b.pessoa_id = p_pessoa and a.local_ts::date between b.inicio and b.fim)
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
revoke all on function pode_cobrir(uuid, uuid) from public;

-- Colegas que posso chamar para cobrir uma escala MINHA
create function colegas_para_troca(p_escala uuid)
returns table (pessoa_id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome
  from pessoas p
  where exists (select 1 from escalas e where e.id = p_escala and e.pessoa_id = minha_pessoa())
    and pode_cobrir(p.id, p_escala)
  order by p.nome
$$;
revoke all on function colegas_para_troca(uuid) from public;

create function pedir_troca(p_escala uuid, p_colega uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := minha_pessoa();
  novo uuid;
begin
  if eu is null then raise exception 'Você não está cadastrado(a) nesta igreja'; end if;
  if not exists (select 1 from escalas where id = p_escala and pessoa_id = eu) then
    raise exception 'Escala não encontrada';
  end if;
  if not pode_cobrir(p_colega, p_escala) then
    raise exception 'Esse colega não pode cobrir essa escala';
  end if;
  insert into trocas (escala_id, solicitante_id, colega_id) values (p_escala, eu, p_colega)
  returning id into novo;
  return novo;
exception when unique_violation then
  raise exception 'Já existe um pedido de troca aguardando resposta para essa escala';
end $$;
revoke all on function pedir_troca(uuid, uuid) from public;

-- Aceitar (true) ou recusar (false) um pedido que recebi
create function responder_troca(p_troca uuid, p_aceitar boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := minha_pessoa();
  t trocas%rowtype;
  e escalas%rowtype;
begin
  select * into t from trocas where id = p_troca and colega_id = eu and status = 'pendente' for update;
  if not found then raise exception 'Pedido não encontrado ou já respondido'; end if;

  if not p_aceitar then
    update trocas set status = 'recusada', respondido_em = now() where id = t.id;
    return;
  end if;

  select * into e from escalas where id = t.escala_id for update;
  if not found or e.pessoa_id <> t.solicitante_id or e.status not in ('pendente', 'confirmado') then
    update trocas set status = 'cancelada', respondido_em = now() where id = t.id;
    raise exception 'Essa escala mudou e o pedido perdeu a validade';
  end if;
  if not pode_cobrir(eu, e.id) then
    raise exception 'Você não pode cobrir essa escala (data passada, conflito ou indisponibilidade)';
  end if;

  update escalas set status = 'trocado', respondido_em = now() where id = e.id;
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, papel, status, respondido_em)
  values (e.evento_id, e.ministerio_id, e.funcao_id, eu, 'titular', 'confirmado', now());
  update trocas set status = 'aceita', respondido_em = now() where id = t.id;
end $$;
revoke all on function responder_troca(uuid, boolean) from public;

create function cancelar_troca(p_troca uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update trocas set status = 'cancelada', respondido_em = now()
   where id = p_troca and solicitante_id = minha_pessoa() and status = 'pendente';
  if not found then raise exception 'Pedido não encontrado ou já respondido'; end if;
end $$;
revoke all on function cancelar_troca(uuid) from public;

-- Meus pedidos: recebidos (para eu responder) e enviados (para eu acompanhar)
create function minhas_trocas()
returns table (
  id uuid, direcao text, status text, outra_pessoa text,
  titulo text, inicio timestamptz, funcao text, ministerio text
)
language sql stable security definer set search_path = public as $$
  select t.id,
         case when t.colega_id = minha_pessoa() then 'recebida' else 'enviada' end,
         t.status,
         case when t.colega_id = minha_pessoa() then ps.nome else pc.nome end,
         ev.titulo, ev.inicio, f.nome, m.nome
  from trocas t
  join escalas e on e.id = t.escala_id
  join eventos ev on ev.id = e.evento_id
  join funcoes f on f.id = e.funcao_id
  join ministerios m on m.id = e.ministerio_id
  join pessoas ps on ps.id = t.solicitante_id
  join pessoas pc on pc.id = t.colega_id
  where minha_pessoa() in (t.solicitante_id, t.colega_id)
    and t.status = 'pendente' and ev.inicio > now()
  order by ev.inicio
$$;
revoke all on function minhas_trocas() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function colegas_para_troca(uuid) to authenticated';
    execute 'grant execute on function pedir_troca(uuid, uuid) to authenticated';
    execute 'grant execute on function responder_troca(uuid, boolean) to authenticated';
    execute 'grant execute on function cancelar_troca(uuid) to authenticated';
    execute 'grant execute on function minhas_trocas() to authenticated';
  end if;
end $$;

-- Visitante sem login nunca executa (o Supabase concede execução ao anon por padrão)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function colegas_para_troca(uuid), pedir_troca(uuid, uuid), responder_troca(uuid, boolean), cancelar_troca(uuid), minhas_trocas() from anon';
  end if;
end $$;
