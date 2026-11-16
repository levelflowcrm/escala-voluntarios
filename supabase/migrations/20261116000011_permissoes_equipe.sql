-- =============================================================================
-- Tela de permissões: o administrador vê quem é administrador/coordenador e
-- define coordenadores de cada ministério. Promover/remover ADMINISTRADORES
-- continua só para o master (definir_admin).
-- =============================================================================

create function equipe_permissoes()
returns table (
  pessoa_id uuid, nome text, email text, conectado boolean,
  admin boolean, master boolean, coordena uuid[]
)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.email, (p.auth_user_id is not null),
         exists (select 1 from administradores a where a.pessoa_id = p.id),
         exists (select 1 from administradores a where a.pessoa_id = p.id and a.master),
         coalesce((select array_agg(mm.ministerio_id) from membros_ministerio mm
                   where mm.pessoa_id = p.id and mm.papel = 'coordenador'), '{}')
  from pessoas p
  where sou_admin() and p.ativo and p.igreja_id = minha_igreja()
  order by p.nome
$$;

create function definir_coordenador(p_pessoa uuid, p_ministerio uuid, p_coordenador boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not sou_admin() then raise exception 'Só administradores podem definir coordenadores'; end if;
  if not exists (select 1 from ministerios where id = p_ministerio and igreja_id = minha_igreja()) then
    raise exception 'Ministério não encontrado';
  end if;
  if not exists (select 1 from pessoas where id = p_pessoa and ativo and igreja_id = minha_igreja()) then
    raise exception 'Pessoa não encontrada';
  end if;
  if p_coordenador then
    insert into membros_ministerio (pessoa_id, ministerio_id, papel)
    values (p_pessoa, p_ministerio, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  else
    -- deixa de coordenar, mas continua no time como voluntário
    update membros_ministerio set papel = 'voluntario'
     where pessoa_id = p_pessoa and ministerio_id = p_ministerio;
  end if;
end $$;

do $$
begin
  execute 'revoke execute on function equipe_permissoes(), definir_coordenador(uuid, uuid, boolean) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function equipe_permissoes(), definir_coordenador(uuid, uuid, boolean) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function equipe_permissoes(), definir_coordenador(uuid, uuid, boolean) to authenticated';
  end if;
end $$;
