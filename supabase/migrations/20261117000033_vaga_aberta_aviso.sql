-- =============================================================================
-- Vaga aberta avisa o time: quando um voluntário titular deixa a escala ("Não posso" / pedir troca),
-- todos os colegas que PODEM assumir a vaga (membros do ministério, aptos na função, sem conflito,
-- bloqueio ou indisponibilidade) recebem um WhatsApp convidando a assumir pelo app.
--   * Só vale com a escala já publicada e o evento no futuro (as mesmas regras de pode_assumir_vaga).
--   * Agrupado por evento: cada pessoa recebe no máximo UM aviso por culto, mesmo que abram várias vagas
--     (o texto é genérico e a lista completa fica em /vagas).
--   * Passa pela mesma fila (limites, validade e kill-switch). Não cita quem saiu.
-- =============================================================================
create function tg_whatsapp_vaga_aberta()
returns trigger
language plpgsql security definer set search_path = public as $$
declare m record; rot text; chave text;
begin
  if new.status <> 'recusado' or old.status = 'recusado' then return new; end if;
  if new.papel <> 'titular' or new.funcao_id is null then return new; end if;
  rot := rotulo_evento_whatsapp(new.evento_id);
  for m in
    select mm.pessoa_id, p.nome from membros_ministerio mm join pessoas p on p.id = mm.pessoa_id
    where mm.ministerio_id = new.ministerio_id
      and mm.pessoa_id <> new.pessoa_id
      and pode_assumir_vaga(mm.pessoa_id, new.evento_id, new.funcao_id)
  loop
    chave := 'vaga:' || new.evento_id || ':' || m.pessoa_id;
    perform enfileirar_whatsapp(m.pessoa_id, 'vaga_aberta', chave,
      case abs(hashtext(chave)) % 2
        when 0 then 'Oi, ' || split_part(m.nome, ' ', 1) || '! 🙋 Abriu vaga para servir em ' || rot || '. Se puder ajudar, assuma pelo app: https://maisconectados.com.br/vagas'
        else split_part(m.nome, ' ', 1) || ', precisamos de voluntário em ' || rot || '. Se você puder, é só assumir a vaga aqui: https://maisconectados.com.br/vagas'
      end);
  end loop;
  return new;
end;
$$;
create trigger whatsapp_vaga_aberta after update of status on escalas
  for each row execute function tg_whatsapp_vaga_aberta();
revoke execute on function tg_whatsapp_vaga_aberta() from public, authenticated, anon;
