-- =============================================================================
-- Correção de segurança: nada é visível para quem não fez login.
--
-- 1) Escalas publicadas apareciam para visitantes anônimos (a política não
--    conferia a igreja de quem pergunta).
-- 2) A visão carga_voluntarios rodava com permissão do dono e ignorava a RLS.
-- 3) Defesa extra: o papel "anon" do Supabase perde acesso a todas as tabelas.
-- =============================================================================

-- 1) Escalas: só pessoas da mesma igreja
drop policy if exists leitura on escalas_ministerio;
create policy leitura on escalas_ministerio for select using (
  ministerio_id in (select id from ministerios where igreja_id = minha_igreja())
  and (publicada or sou_coordenador(ministerio_id)));

drop policy if exists leitura on escalas;
create policy leitura on escalas for select using (
  ministerio_id in (select id from ministerios where igreja_id = minha_igreja())
  and (
    sou_coordenador(ministerio_id)
    or pessoa_id = minha_pessoa()
    or exists (select 1 from escalas_ministerio em
               where em.evento_id = escalas.evento_id
                 and em.ministerio_id = escalas.ministerio_id and em.publicada)));

-- 2) A visão passa a respeitar a RLS de quem consulta
alter view carga_voluntarios set (security_invoker = true);

-- 3) Visitante anônimo não acessa nada
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke all on all sequences in schema public from anon';
    execute 'alter default privileges in schema public revoke all on tables from anon';
    execute 'alter default privileges in schema public revoke all on sequences from anon';
  end if;
end $$;
