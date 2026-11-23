-- =============================================================================
-- POP (Procedimento Operacional Padrão) do time.
-- Cada ministério pode ter um POP: texto e/ou link para um documento (Drive, PDF...).
-- Quem lê: membros do ministério e administradores. Quem edita: facilitador do
-- ministério e administradores, só pela função salvar_pop (ninguém grava direto).
-- Salvar com texto e link vazios remove o POP.
-- =============================================================================
create table pop_ministerio (
  ministerio_id   uuid primary key references ministerios(id) on delete cascade,
  conteudo        text not null default '' check (length(conteudo) <= 20000),
  link            text check (link is null or (length(link) <= 500 and link ~* '^https?://')),
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid references pessoas(id) on delete set null,
  check (length(trim(conteudo)) > 0 or link is not null)
);
alter table pop_ministerio enable row level security;
create policy leitura on pop_ministerio for select using (
  sou_admin()
  or exists (select 1 from membros_ministerio mm where mm.ministerio_id = pop_ministerio.ministerio_id and mm.pessoa_id = minha_pessoa()));
revoke all on pop_ministerio from anon, authenticated;

create function salvar_pop(p_ministerio uuid, p_conteudo text, p_link text)
returns void
language plpgsql security definer set search_path = public as $$
declare c text := coalesce(trim(p_conteudo), ''); l text := nullif(trim(coalesce(p_link, '')), '');
begin
  if not (sou_coordenador(p_ministerio) or (sou_admin() and exists (select 1 from ministerios where id = p_ministerio and igreja_id = minha_igreja()))) then
    raise exception 'Só o facilitador do time pode editar o POP' using errcode = '42501';
  end if;
  if length(c) > 20000 then raise exception 'Texto muito longo (máximo 20000 letras)'; end if;
  if l is not null and l !~* '^https?://' then raise exception 'O link precisa começar com http:// ou https://'; end if;
  if c = '' and l is null then
    delete from pop_ministerio where ministerio_id = p_ministerio;
    return;
  end if;
  insert into pop_ministerio (ministerio_id, conteudo, link, atualizado_em, atualizado_por)
    values (p_ministerio, c, l, now(), minha_pessoa())
  on conflict (ministerio_id) do update
    set conteudo = excluded.conteudo, link = excluded.link, atualizado_em = now(), atualizado_por = minha_pessoa();
end $$;

revoke all on function salvar_pop(uuid, text, text) from public, authenticated, anon;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on pop_ministerio to authenticated';
    execute 'grant execute on function salvar_pop(uuid, text, text) to authenticated';
  end if;
end $$;
