-- =============================================================================
-- Lembrete do MaisFeliz por WhatsApp: na rotina diária, quem serviu hoje e ainda não
-- avaliou recebe UMA mensagem lembrando que dá para responder até a meia-noite.
--   * mesmas regras da tela: escala publicada, confirmado (ou "Cheguei"), culto começou há 1 h ou mais;
--   * a mensagem não diz nota nem resultado, só convida (o voto continua anônimo);
--   * 1 mensagem por pessoa por dia (chave), mesmo com vários cultos no dia.
-- =============================================================================
create function enfileirar_lembretes_maisfeliz()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; hoje date := (now() at time zone 'America/Sao_Paulo')::date; chave text; culto text;
begin
  for r in
    select x.pessoa_id, p.nome,
           string_agg(x.titulo, ' e ' order by x.inicio) as cultos
    from (
      select distinct es.pessoa_id, ev.id as evento_id, ev.titulo, ev.inicio
        from escalas es
        join eventos ev on ev.id = es.evento_id and not ev.so_agenda
        join escalas_ministerio em on em.evento_id = es.evento_id and em.ministerio_id = es.ministerio_id and em.publicada
       where (ev.inicio at time zone 'America/Sao_Paulo')::date = hoje
         and (es.status = 'confirmado' or es.chegou_em is not null)
         and now() >= ev.inicio + interval '1 hour'
         and not exists (select 1 from maisfeliz_participacao mp where mp.evento_id = ev.id and mp.pessoa_id = es.pessoa_id)
    ) x
    join pessoas p on p.id = x.pessoa_id
    group by x.pessoa_id, p.nome
  loop
    chave := 'maisfeliz:' || r.pessoa_id || ':' || hoje;
    culto := r.cultos;
    if enfileirar_whatsapp(r.pessoa_id, 'maisfeliz', chave,
      case abs(hashtext(chave)) % 2
        when 0 then 'Oi, ' || r.nome || '! Obrigado por servir hoje (' || culto || '). 💜 Como foi pra você? Toque num emoji no Mais Conectados, leva 5 segundos e é anônimo. Dá para responder até meia-noite: https://maisconectados.com.br'
        else r.nome || ', obrigado por servir hoje (' || culto || ')! Conta pra gente como foi com um emoji, é rápido e anônimo. Fica aberto até meia-noite: https://maisconectados.com.br'
      end) then
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke execute on function enfileirar_lembretes_maisfeliz() from public, authenticated, anon;
