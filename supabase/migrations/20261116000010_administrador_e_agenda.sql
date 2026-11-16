-- =============================================================================
-- Administrador da igreja + Agenda geral.
--
--  * administradores: quem tem poder total no app. O "master" (Luciano
--    Oliveira) não pode ser removido nem rebaixado por ninguém, nem pelo app.
--    Administrador conta como coordenador de todos os ministérios.
--  * Agenda: eventos "só agenda" (conferência, batismo, ação social...) que
--    todos veem e que NÃO entram no Montar escala. Só administrador cria,
--    edita e apaga esses eventos.
-- =============================================================================

create table administradores (
  pessoa_id uuid primary key references pessoas(id) on delete cascade,
  master boolean not null default false,
  desde timestamptz not null default now()
);
alter table administradores enable row level security;
-- Cada um enxerga só a própria linha (administradores são listados por função).
create policy propria on administradores for select using (pessoa_id = minha_pessoa());
-- Sem políticas de escrita: só as funções abaixo e o SQL do servidor mexem aqui.

-- O master é permanente
create function proteger_master() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.master then
    raise exception 'O administrador master não pode ser removido';
  end if;
  if tg_op = 'UPDATE' and old.master and not new.master then
    raise exception 'O administrador master não pode ser rebaixado';
  end if;
  return coalesce(new, old);
end $$;
create trigger administradores_master before update or delete on administradores
  for each row execute function proteger_master();

create function sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from administradores where pessoa_id = minha_pessoa())
$$;

create function sou_admin_master() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from administradores where pessoa_id = minha_pessoa() and master)
$$;

-- Só o master promove ou remove outros administradores
create function definir_admin(p_pessoa uuid, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not sou_admin_master() then raise exception 'Só o administrador master pode fazer isso'; end if;
  if not exists (select 1 from pessoas where id = p_pessoa and igreja_id = minha_igreja()) then
    raise exception 'Pessoa não encontrada';
  end if;
  if p_admin then
    insert into administradores (pessoa_id) values (p_pessoa) on conflict do nothing;
  else
    delete from administradores where pessoa_id = p_pessoa and not master;
  end if;
end $$;

-- Administrador vale como coordenador de todos os ministérios da igreja
create or replace function sou_coordenador(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (sou_admin() and exists (select 1 from ministerios where id = m and igreja_id = minha_igreja()))
      or exists (
        select 1 from membros_ministerio mm
        where mm.ministerio_id = m and mm.pessoa_id = minha_pessoa() and mm.papel = 'coordenador'
      )
$$;

create or replace function sou_coordenador_algum() returns boolean
language sql stable security definer set search_path = public as $$
  select sou_admin() or exists (
    select 1 from membros_ministerio mm
    where mm.pessoa_id = minha_pessoa() and mm.papel = 'coordenador'
  )
$$;

-- Agenda
alter table eventos
  add column so_agenda boolean not null default false,
  add column local text check (char_length(local) <= 120),
  add column tipo_agenda text check (tipo_agenda in ('conferencia', 'batismo', 'ensaio', 'reuniao', 'acao_social', 'outro')),
  add column fim timestamptz,
  add check (fim is null or fim > inicio);

-- Coordenador continua cuidando dos eventos de escala; os de agenda são do administrador
drop policy coordenador on eventos;
create policy coordenador on eventos for all
  using (igreja_id = minha_igreja() and sou_coordenador_algum() and not so_agenda)
  with check (igreja_id = minha_igreja() and sou_coordenador_algum() and not so_agenda);
create policy administrador on eventos for all
  using (igreja_id = minha_igreja() and sou_admin())
  with check (igreja_id = minha_igreja() and sou_admin());

-- Funções só para quem está logado
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function sou_admin(), sou_admin_master(), definir_admin(uuid, boolean) from anon';
  end if;
  execute 'revoke execute on function sou_admin(), sou_admin_master(), definir_admin(uuid, boolean) from public';
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function sou_admin(), sou_admin_master(), definir_admin(uuid, boolean) to authenticated';
  end if;
end $$;

-- Criador do app (Luciano Oliveira): administrador master, fora do time de voluntários
insert into administradores (pessoa_id, master)
select id, true from pessoas where email = 'levelflowcrm@gmail.com'
on conflict (pessoa_id) do update set master = true;
