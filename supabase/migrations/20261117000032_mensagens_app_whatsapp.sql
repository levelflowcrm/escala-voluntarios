-- =============================================================================
-- Avisa o administrador master por WhatsApp quando chega um erro/sugestão do app.
--   * Usa a mesma fila (limites, validade e kill-switch continuam valendo); sem celular válido, só fica no app.
--   * Não avisa o master sobre mensagem que ele mesmo enviou.
-- =============================================================================
create function tg_whatsapp_mensagem_app()
returns trigger
language plpgsql security definer set search_path = public as $$
declare m record; autor text; resumo text; texto text;
begin
  select coalesce(split_part(nome, ' ', 1), 'Alguém') into autor from pessoas where id = new.autor_id;
  resumo := left(regexp_replace(new.texto, '\s+', ' ', 'g'), 300);
  if length(new.texto) > 300 then resumo := resumo || '…'; end if;
  texto := '📬 Mais Conectados: ' || case new.tipo when 'erro' then 'novo erro' else 'nova sugestão' end
    || ' de ' || coalesce(autor, 'alguém') || E':\n\n' || resumo || E'\n\n'
    || 'Veja e responda em https://maisconectados.com.br/mensagens';
  for m in
    select a.pessoa_id from administradores a
    join pessoas p on p.id = a.pessoa_id
    where a.master and p.igreja_id = new.igreja_id and a.pessoa_id is distinct from new.autor_id
  loop
    perform enfileirar_whatsapp(m.pessoa_id, 'mensagem_app', 'mensagem-app:' || new.id || ':' || m.pessoa_id, texto);
  end loop;
  return new;
end;
$$;
create trigger whatsapp_mensagem_app after insert on mensagens_app
  for each row execute function tg_whatsapp_mensagem_app();
revoke execute on function tg_whatsapp_mensagem_app() from public, authenticated, anon;
