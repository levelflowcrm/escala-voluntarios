-- =============================================================================
-- "Já informei minha disponibilidade deste mês / do próximo".
-- A tela inicial mostra um cartão discreto enquanto a pessoa não informou o próximo mês.
-- Conta como informado: mexer em qualquer item da tela Disponibilidade ou tocar em
-- "Confirmar" (para quem pode sempre e não precisa mudar nada).
-- =============================================================================
create table disponibilidade_informada (
  pessoa_id    uuid not null references pessoas(id) on delete cascade,
  mes          date not null check (mes = date_trunc('month', mes)::date),  -- sempre o dia 1
  informado_em timestamptz not null default now(),
  primary key (pessoa_id, mes)
);
alter table disponibilidade_informada enable row level security;
create policy propria_leitura on disponibilidade_informada for select using (pessoa_id = minha_pessoa());
revoke all on disponibilidade_informada from anon, authenticated;

-- Marca o mês atual e o próximo como informados (horário de Brasília).
create function informar_disponibilidade() returns void
language sql security definer set search_path = public as $$
  insert into disponibilidade_informada (pessoa_id, mes)
  select minha_pessoa(), m::date
    from generate_series(
           date_trunc('month', now() at time zone 'America/Sao_Paulo'),
           date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month',
           interval '1 month') m
   where minha_pessoa() is not null
  on conflict (pessoa_id, mes) do update set informado_em = now()
$$;

revoke all on function informar_disponibilidade() from public, authenticated, anon;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on disponibilidade_informada to authenticated';
    execute 'grant execute on function informar_disponibilidade() to authenticated';
  end if;
end $$;
