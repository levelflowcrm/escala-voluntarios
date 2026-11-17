-- =============================================================================
-- Fale com o app: qualquer pessoa cadastrada registra um ERRO ou uma SUGESTÃO sobre o
-- próprio Mais Conectados. Quem recebe e acompanha é só o administrador master
-- (levelflowcrm@gmail.com). Diferente de "Sugestões", que vão para o coordenador do ministério.
-- =============================================================================
create table mensagens_app (
  id         uuid primary key default gen_random_uuid(),
  igreja_id  uuid not null default minha_igreja() references igrejas(id) on delete cascade,
  autor_id   uuid references pessoas(id) on delete set null,
  tipo       text not null check (tipo in ('erro', 'sugestao')),
  texto      text not null check (length(trim(texto)) between 1 and 2000),
  pagina     text check (pagina is null or length(pagina) <= 200),
  status     text not null default 'nova' check (status in ('nova', 'vista', 'resolvida')),
  criado_em  timestamptz not null default now()
);
create index mensagens_app_recentes on mensagens_app (igreja_id, criado_em desc);

alter table mensagens_app enable row level security;

-- Vê: o master e o próprio autor
create policy leitura on mensagens_app for select using (
  igreja_id = minha_igreja() and (sou_admin_master() or autor_id = minha_pessoa()));

-- Envia: qualquer pessoa cadastrada, sempre em nome de si mesma e como "nova"
create policy envia on mensagens_app for insert with check (
  igreja_id = minha_igreja() and autor_id = minha_pessoa() and status = 'nova');

-- Só o master acompanha (vista / resolvida) e apaga
create policy master_atualiza on mensagens_app for update
  using (igreja_id = minha_igreja() and sou_admin_master())
  with check (igreja_id = minha_igreja() and sou_admin_master());
create policy master_apaga on mensagens_app for delete
  using (igreja_id = minha_igreja() and sou_admin_master());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on mensagens_app from anon';
  end if;
end $$;
