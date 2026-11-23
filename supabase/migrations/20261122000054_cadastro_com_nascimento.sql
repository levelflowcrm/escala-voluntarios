-- =============================================================================
-- Adicionar voluntário: o facilitador já informa a data de nascimento no cadastro
-- (o celular passa a ser obrigatório na tela, pois é o canal de comunicação).
-- Troca a função por uma versão com p_aniversario (opcional no banco, para a
-- pessoa que já existe não perder o que já tem: só preenche se estiver vazio).
-- =============================================================================
drop function adicionar_voluntario(text, text, text, uuid, uuid[]);

create function adicionar_voluntario(
  p_nome text, p_email text, p_celular text, p_ministerio uuid, p_funcoes uuid[] default '{}', p_aniversario date default null
)
returns table (pessoa_id uuid, ja_existia boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  igreja uuid := minha_igreja();
  nome_limpo text := btrim(coalesce(p_nome, ''));
  email_limpo text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  celular_limpo text := nullif(btrim(coalesce(p_celular, '')), '');
  pessoa uuid;
  existia boolean := false;
begin
  if not sou_coordenador(p_ministerio) then
    raise exception 'Só o coordenador deste ministério pode adicionar voluntários';
  end if;
  if not exists (select 1 from ministerios where id = p_ministerio and igreja_id = igreja) then
    raise exception 'Ministério não encontrado';
  end if;
  if char_length(nome_limpo) < 2 then raise exception 'Informe o nome do voluntário'; end if;
  if p_aniversario is not null and (p_aniversario > current_date or p_aniversario < date '1900-01-01') then
    raise exception 'Data de nascimento inválida';
  end if;
  if email_limpo is not null and email_limpo !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail inválido';
  end if;

  if email_limpo is not null then
    select id into pessoa from pessoas where igreja_id = igreja and lower(email) = email_limpo;
  end if;

  if pessoa is not null then
    existia := true;
    update pessoas set ativo = true where id = pessoa and not ativo;
    update pessoas set aniversario = p_aniversario where id = pessoa and aniversario is null and p_aniversario is not null;
  else
    if exists (select 1 from pessoas where igreja_id = igreja and lower(nome) = lower(nome_limpo)) then
      raise exception 'Já existe alguém com o nome "%". Acrescente o sobrenome (ex.: % S.)', nome_limpo, nome_limpo;
    end if;
    insert into pessoas (igreja_id, nome, email, celular, aniversario)
    values (igreja, nome_limpo, email_limpo, celular_limpo, p_aniversario)
    returning id into pessoa;
  end if;

  insert into membros_ministerio (pessoa_id, ministerio_id) values (pessoa, p_ministerio)
  on conflict (pessoa_id, ministerio_id) do nothing;

  insert into habilitacoes (pessoa_id, funcao_id, nivel)
  select pessoa, f.id, 'apto' from funcoes f
   where f.id = any (coalesce(p_funcoes, '{}')) and f.ministerio_id = p_ministerio and f.ativo
  on conflict (pessoa_id, funcao_id) do nothing;

  return query select pessoa, existia;
end $$;

do $$
begin
  execute 'revoke execute on function adicionar_voluntario(text, text, text, uuid, uuid[], date) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function adicionar_voluntario(text, text, text, uuid, uuid[], date) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function adicionar_voluntario(text, text, text, uuid, uuid[], date) to authenticated';
  end if;
end $$;
