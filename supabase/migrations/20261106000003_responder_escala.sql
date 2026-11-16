-- =============================================================================
-- Confirmar / Não posso e rascunho da escala
--
-- 1) Rascunho é só do coordenador: o voluntário passa a ver a própria escala
--    só depois de publicada (regra 8). Antes ele via o rascunho também.
-- 2) responder_escala() só aceita resposta de escala publicada, de evento que
--    ainda não aconteceu e que não foi trocada. Quem já confirmou ainda pode
--    avisar que não pode; quem recusou pode voltar atrás se a vaga continuar
--    livre (o índice único impede ocupar a vaga de outra pessoa).
-- =============================================================================

drop policy if exists leitura on escalas;
create policy leitura on escalas for select using (
  ministerio_id in (select id from ministerios where igreja_id = minha_igreja())
  and (
    sou_coordenador(ministerio_id)
    or exists (select 1 from escalas_ministerio em
               where em.evento_id = escalas.evento_id
                 and em.ministerio_id = escalas.ministerio_id and em.publicada)));

create or replace function responder_escala(escala uuid, resposta status_escala, motivo_txt text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  e escalas%rowtype;
begin
  if resposta not in ('confirmado', 'recusado') then
    raise exception 'Resposta inválida';
  end if;

  select * into e from escalas where id = escala and pessoa_id = minha_pessoa();
  if not found then
    raise exception 'Escala não encontrada';
  end if;
  if e.status = 'trocado' then
    raise exception 'Essa escala foi trocada pelo coordenador';
  end if;
  if not exists (select 1 from escalas_ministerio em
                 where em.evento_id = e.evento_id and em.ministerio_id = e.ministerio_id and em.publicada) then
    raise exception 'Essa escala ainda não foi publicada';
  end if;
  if (select inicio from eventos where id = e.evento_id) < now() then
    raise exception 'Esse evento já aconteceu';
  end if;

  update escalas
     set status = resposta,
         motivo = case when resposta = 'recusado' then nullif(trim(motivo_txt), '') end,
         respondido_em = now()
   where id = escala;
exception
  when unique_violation then
    raise exception 'Essa vaga já foi passada para outra pessoa';
end $$;

revoke all on function responder_escala(uuid, status_escala, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function responder_escala(uuid, status_escala, text) to authenticated';
  end if;
end $$;
