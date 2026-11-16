-- =============================================================================
-- Privacidade: e-mail, celular, aniversário, nome completo e vínculo de login
-- deixam de ser legíveis por qualquer voluntário (antes, quem falasse direto com
-- a API lia isso de todos da igreja). Agora:
--   * a tabela pessoas só expõe id, igreja_id, nome, ativo e criado_em;
--   * meus_dados()    -> os próprios dados completos;
--   * dados_do_time() -> dados de contato de quem está nos ministérios que o
--                        usuário coordena (só coordenador recebe linhas).
-- O app já usa essas funções. Edições (UPDATE) continuam como antes.
-- =============================================================================
revoke select on pessoas from authenticated;
grant select (id, igreja_id, nome, ativo, criado_em) on pessoas to authenticated;

create function meus_dados()
returns table (nome text, nome_completo text, email text, celular text, aniversario date)
language sql stable security definer set search_path = public as $$
  select p.nome, p.nome_completo, p.email, p.celular, p.aniversario
  from pessoas p where p.id = minha_pessoa()
$$;
revoke all on function meus_dados() from public;

create function dados_do_time()
returns table (pessoa_id uuid, nome text, email text, aniversario date, conectado boolean)
language sql stable security definer set search_path = public as $$
  select distinct p.id, p.nome, p.email, p.aniversario, (p.auth_user_id is not null)
  from pessoas p
  join membros_ministerio mm on mm.pessoa_id = p.id
  where p.ativo and sou_coordenador(mm.ministerio_id)
$$;
revoke all on function dados_do_time() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function meus_dados() to authenticated';
    execute 'grant execute on function dados_do_time() to authenticated';
  end if;
  -- o Supabase concede execução a "anon" por padrão; aqui e nas funções anteriores tiramos
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function meus_dados(), dados_do_time(), vagas_abertas(), assumir_vaga(uuid, uuid), pode_assumir_vaga(uuid, uuid, uuid) from anon';
  end if;
end $$;
