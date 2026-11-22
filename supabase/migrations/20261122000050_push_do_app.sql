-- =============================================================================
-- Push do app (aviso na tela do celular, com som e número no ícone).
--
--   * push_assinaturas: um aparelho por linha (endpoint único). Privada: só o servidor
--     (chave de serviço) lê; o app registra e remove pelas funções abaixo.
--   * registrar_push / remover_push: sempre em nome de quem está logado. Se o mesmo aparelho
--     for usado por outra pessoa, a assinatura passa para quem entrou por último.
--   * fila_whatsapp.push_enviado_em: o mesmo aviso da fila também sai por push (nível 1 do
--     docs/AVISOS.md) e a coluna garante que cada aviso vai uma vez só por push.
-- =============================================================================
create table push_assinaturas (
  id            uuid primary key default gen_random_uuid(),
  pessoa_id     uuid not null references pessoas(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  agente        text,
  criado_em     timestamptz not null default now(),
  ultimo_ok_em  timestamptz
);
create index push_assinaturas_por_pessoa on push_assinaturas (pessoa_id);
alter table push_assinaturas enable row level security;
revoke all on push_assinaturas from anon, authenticated;

create function registrar_push(p_endpoint text, p_p256dh text, p_auth text, p_agente text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare eu uuid := minha_pessoa();
begin
  if eu is null then raise exception 'Sem cadastro'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 1 and 200
     or coalesce(length(p_auth), 0) not between 1 and 100 then
    raise exception 'Assinatura inválida';
  end if;
  insert into push_assinaturas (pessoa_id, endpoint, p256dh, auth, agente)
  values (eu, p_endpoint, p_p256dh, p_auth, left(p_agente, 300))
  on conflict (endpoint) do update
    set pessoa_id = excluded.pessoa_id, p256dh = excluded.p256dh, auth = excluded.auth, agente = excluded.agente;
end $$;

create function remover_push(p_endpoint text)
returns void
language sql security definer set search_path = public as $$
  delete from push_assinaturas where endpoint = p_endpoint and pessoa_id = minha_pessoa()
$$;

alter table fila_whatsapp add column push_enviado_em timestamptz;
create index fila_whatsapp_push_pendentes on fila_whatsapp (criado_em) where push_enviado_em is null;

revoke all on function registrar_push(text, text, text, text), remover_push(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function registrar_push(text, text, text, text), remover_push(text) to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function registrar_push(text, text, text, text), remover_push(text) from anon';
  end if;
end $$;
