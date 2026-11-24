-- Animação "missão cumprida" (+10): a primeira vez que o voluntário abre o app depois de servir.
-- escalas.celebrada_em guarda quando a animação foi entregue, para aparecer uma só vez (em qualquer aparelho).
alter table escalas add column if not exists celebrada_em timestamptz;

-- Quem já serviu antes de hoje não recebe animação retroativa no lançamento.
update escalas es set celebrada_em = now()
  from eventos ev
 where ev.id = es.evento_id and ev.inicio < now() and es.celebrada_em is null;

-- Entrega (e marca como entregues) as escalas do próprio voluntário que já foram servidas:
-- confirmada, escala publicada, culto começou há mais de 2 h e há no máximo 3 dias.
create or replace function celebrar_cultos_servidos()
returns table (escala_id uuid, titulo text, inicio timestamptz)
language sql security definer set search_path = public as $$
  with alvo as (
    select es.id
      from escalas es
      join eventos ev on ev.id = es.evento_id
      join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
     where es.pessoa_id = minha_pessoa()
       and es.status = 'confirmado'
       and es.celebrada_em is null
       and ev.inicio < now() - interval '2 hours'
       and ev.inicio > now() - interval '3 days'
       for update of es skip locked
  ), marcadas as (
    update escalas set celebrada_em = now() from alvo where escalas.id = alvo.id
    returning escalas.id, escalas.evento_id
  )
  select m.id, ev.titulo, ev.inicio from marcadas m join eventos ev on ev.id = m.evento_id order by ev.inicio
$$;

revoke all on function celebrar_cultos_servidos() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function celebrar_cultos_servidos() to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function celebrar_cultos_servidos() from anon';
  end if;
end $$;
