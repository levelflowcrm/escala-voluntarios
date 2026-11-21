-- =============================================================================
-- WhatsApp: a fila passa a andar a cada 10 minutos, com prioridade e validade por tipo.
--
--   * prioridade (1 = sai primeiro): ocorrência → vaga/troca/chegada → lembretes e avisos
--     → parabéns, boas-vindas e MaisFeliz.
--   * valido_ate: até quando a mensagem ainda faz sentido (ex.: "Cheguei" vale 3h;
--     parabéns e MaisFeliz valem até o fim do dia). Depois disso é descartada.
--   * reservado_em: quem está enviando "reserva" a mensagem antes, para duas rotinas
--     rodando ao mesmo tempo nunca mandarem a mesma mensagem duas vezes.
--   * Agendador (pg_cron + pg_net, já incluídos no Supabase): chama
--     https://maisconectados.com.br/api/cron/enviar a cada 10 minutos, com a senha
--     guardada no cofre do Supabase (vault, segredo "cron_secret"). O horário de
--     silêncio (22h–7h), o teto diário e o ritmo entre mensagens ficam no app.
-- =============================================================================
alter table fila_whatsapp
  add column prioridade   smallint not null default 3,
  add column valido_ate   timestamptz,
  add column reservado_em timestamptz;

create index fila_whatsapp_proximas on fila_whatsapp (prioridade, criado_em) where enviado_em is null;

-- Fim do dia de hoje em São Paulo
create function fim_do_dia_sp() returns timestamptz
language sql stable as $$
  select (((now() at time zone 'America/Sao_Paulo')::date + 1)::timestamp at time zone 'America/Sao_Paulo')
$$;

create function tg_fila_whatsapp_regras()
returns trigger
language plpgsql as $$
begin
  new.prioridade := case new.tipo
    when 'ocorrencia'   then 1
    when 'vaga_aberta'  then 2
    when 'troca'        then 2
    when 'chegada'      then 2
    when 'aniversario'  then 4
    when 'boas_vindas'  then 4
    when 'maisfeliz'    then 4
    else 3                       -- lembrete, publicada, repertorio, mensagem_app e novos tipos
  end;
  if new.valido_ate is null then
    new.valido_ate := case new.tipo
      when 'chegada'      then now() + interval '3 hours'
      when 'lembrete'     then now() + interval '14 hours'
      when 'aniversario'  then fim_do_dia_sp()
      when 'maisfeliz'    then fim_do_dia_sp()
      when 'ocorrencia'   then now() + interval '24 hours'
      when 'vaga_aberta'  then now() + interval '24 hours'
      when 'troca'        then now() + interval '24 hours'
      when 'repertorio'   then now() + interval '24 hours'
      when 'publicada'    then now() + interval '48 hours'
      when 'mensagem_app' then now() + interval '48 hours'
      when 'boas_vindas'  then now() + interval '72 hours'
      else now() + interval '12 hours'
    end;
  end if;
  return new;
end;
$$;
create trigger fila_whatsapp_regras before insert on fila_whatsapp
  for each row execute function tg_fila_whatsapp_regras();
revoke execute on function tg_fila_whatsapp_regras() from public;

-- O que já estava na fila segue a regra antiga (12h a partir da criação)
update fila_whatsapp set valido_ate = criado_em + interval '12 hours' where enviado_em is null and valido_ate is null;

-- Agendador a cada 10 minutos (só no Supabase; o banco de teste local não tem pg_cron/pg_net)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net with schema extensions;
    perform cron.schedule(
      'whatsapp-envio',
      '*/10 * * * *',
      $job$
        select net.http_get(
          url := 'https://maisconectados.com.br/api/cron/enviar',
          headers := jsonb_build_object(
            'Authorization',
            'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
          ),
          timeout_milliseconds := 60000
        );
      $job$
    );
  end if;
end $$;
