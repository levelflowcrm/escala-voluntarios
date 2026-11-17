-- =============================================================================
-- Avisos por WhatsApp: o banco só ENFILEIRA; quem envia é o app (rotina no servidor).
--   * fila_whatsapp: privada (RLS sem políticas e sem privilégios para anon/authenticated).
--   * enfileirar_whatsapp: interna; ignora quem não tem celular válido ou está inativo; a "chave" evita duplicar.
--   * Gatilhos: chegada (avisa coordenadores), troca pedida/respondida, escala publicada.
--   * enfileirar_lembretes(): lembrete de véspera, 1 mensagem por pessoa por dia (chamada pela rotina diária).
-- =============================================================================

create table fila_whatsapp (
  id          uuid primary key default gen_random_uuid(),
  pessoa_id   uuid not null references pessoas(id) on delete cascade,
  tipo        text not null,
  chave       text not null unique,
  texto       text not null,
  criado_em   timestamptz not null default now(),
  enviado_em  timestamptz,
  tentativas  smallint not null default 0,
  erro        text
);
create index fila_whatsapp_pendentes on fila_whatsapp (criado_em) where enviado_em is null;
alter table fila_whatsapp enable row level security;
revoke all on fila_whatsapp from anon, authenticated;

-- Enfileira uma mensagem. Devolve true se entrou na fila (false: sem celular válido, inativo ou já enfileirada).
create function enfileirar_whatsapp(p_pessoa uuid, p_tipo text, p_chave text, p_texto text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from pessoas p
    where p.id = p_pessoa and p.ativo
      and length(regexp_replace(coalesce(p.celular, ''), '\D', '', 'g')) between 10 and 13
  ) then
    return false;
  end if;
  insert into fila_whatsapp (pessoa_id, tipo, chave, texto) values (p_pessoa, p_tipo, p_chave, p_texto)
  on conflict (chave) do nothing;
  return found;
end;
$$;

-- "Encontro de Vida - Quarta, quarta 18/11 às 19:30"
create function rotulo_evento_whatsapp(p_evento uuid)
returns text
language sql stable security definer set search_path = public as $$
  select ev.titulo || ', ' ||
    (array['domingo','segunda','terça','quarta','quinta','sexta','sábado'])[extract(dow from ev.inicio at time zone 'America/Sao_Paulo')::int + 1]
    || ' ' || to_char(ev.inicio at time zone 'America/Sao_Paulo', 'DD/MM') || ' às ' || to_char(ev.inicio at time zone 'America/Sao_Paulo', 'HH24:MI')
  from eventos ev where ev.id = p_evento
$$;

-- Chegada: avisa os coordenadores do ministério.
create function tg_whatsapp_chegada()
returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; quem text; fn text; rot text; chave text;
begin
  if new.chegou_em is null or old.chegou_em is not null then return new; end if;
  select nome into quem from pessoas where id = new.pessoa_id;
  select nome into fn from funcoes where id = new.funcao_id;
  rot := rotulo_evento_whatsapp(new.evento_id);
  for c in
    select mm.pessoa_id, p.nome from membros_ministerio mm join pessoas p on p.id = mm.pessoa_id
    where mm.ministerio_id = new.ministerio_id and mm.papel = 'coordenador' and mm.pessoa_id <> new.pessoa_id
  loop
    chave := 'chegada:' || new.id || ':' || c.pessoa_id;
    perform enfileirar_whatsapp(c.pessoa_id, 'chegada', chave,
      case abs(hashtext(chave)) % 3
        when 0 then 'Oi, ' || c.nome || '! ' || quem || ' acabou de chegar' || coalesce(' para ' || fn, '') || ' (' || rot || ').'
        when 1 then c.nome || ', aviso rápido: ' || quem || ' já está na igreja' || coalesce(' (' || fn || ')', '') || ' — ' || rot || '.'
        else 'Olá, ' || c.nome || '. ' || quem || ' chegou' || coalesce(' e vai servir em ' || fn, '') || ' (' || rot || ').'
      end);
  end loop;
  return new;
end;
$$;
create trigger whatsapp_chegada after update of chegou_em on escalas
  for each row execute function tg_whatsapp_chegada();

-- Troca pedida (avisa o colega) e respondida (avisa quem pediu).
create function tg_whatsapp_troca()
returns trigger
language plpgsql security definer set search_path = public as $$
declare ev uuid; rot text; solic text; colega text; chave text;
begin
  select e.evento_id into ev from escalas e where e.id = new.escala_id;
  rot := rotulo_evento_whatsapp(ev);
  select nome into solic from pessoas where id = new.solicitante_id;
  select nome into colega from pessoas where id = new.colega_id;
  if tg_op = 'INSERT' and new.status = 'pendente' then
    chave := 'troca:' || new.id || ':pedido';
    perform enfileirar_whatsapp(new.colega_id, 'troca', chave,
      case abs(hashtext(chave)) % 2
        when 0 then 'Oi, ' || colega || '! ' || solic || ' pediu para trocar a escala de ' || rot || ' com você. Abra o Mais Conectados para aceitar ou recusar: https://maisconectados.com.br/trocas'
        else colega || ', ' || solic || ' precisa de uma troca em ' || rot || ' e pediu a sua ajuda. Responda pelo app: https://maisconectados.com.br/trocas'
      end);
  elsif tg_op = 'UPDATE' and old.status = 'pendente' and new.status in ('aceita', 'recusada') then
    chave := 'troca:' || new.id || ':' || new.status;
    perform enfileirar_whatsapp(new.solicitante_id, 'troca', chave,
      case when new.status = 'aceita'
        then 'Oi, ' || solic || '! ' || colega || ' aceitou a troca de ' || rot || '. A escala já foi atualizada.'
        else 'Oi, ' || solic || '. ' || colega || ' não pôde trocar ' || rot || '. Você continua escalado(a); tente outro colega pelo app.'
      end);
  end if;
  return new;
end;
$$;
create trigger whatsapp_troca_pedida after insert on trocas
  for each row execute function tg_whatsapp_troca();
create trigger whatsapp_troca_respondida after update of status on trocas
  for each row execute function tg_whatsapp_troca();

-- Escala publicada: 1 mensagem por pessoa por ministério por hora (publicar o mês inteiro não vira enxurrada).
create function tg_whatsapp_publicada()
returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; mnome text; chave text;
begin
  if not new.publicada or old.publicada then return new; end if;
  select nome into mnome from ministerios where id = new.ministerio_id;
  for r in
    select distinct s.pessoa_id, p.nome from escalas s join pessoas p on p.id = s.pessoa_id
    where s.evento_id = new.evento_id and s.ministerio_id = new.ministerio_id
  loop
    chave := 'publicada:' || new.ministerio_id || ':' || r.pessoa_id || ':' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYYMMDDHH24');
    perform enfileirar_whatsapp(r.pessoa_id, 'publicada', chave,
      case abs(hashtext(chave)) % 2
        when 0 then 'Oi, ' || r.nome || '! A escala de ' || mnome || ' foi publicada. Abra o Mais Conectados para ver seus dias e confirmar presença: https://maisconectados.com.br'
        else r.nome || ', saiu a escala de ' || mnome || '. Confira suas datas e confirme pelo app: https://maisconectados.com.br'
      end);
  end loop;
  return new;
end;
$$;
create trigger whatsapp_publicada after update of publicada on escalas_ministerio
  for each row execute function tg_whatsapp_publicada();

-- Lembrete de véspera: quem serve amanhã (escala publicada, ainda não recusada) recebe UMA mensagem com a lista.
create function enfileirar_lembretes()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; amanha date := (now() at time zone 'America/Sao_Paulo')::date + 1; chave text; fecho text;
begin
  -- fila antiga (enviada há mais de 30 dias) não precisa ficar guardada
  delete from fila_whatsapp where criado_em < now() - interval '30 days';

  for r in
    select s.pessoa_id, p.nome,
           string_agg('• ' || to_char(ev.inicio at time zone 'America/Sao_Paulo', 'HH24:MI') || ' ' || ev.titulo || coalesce(' (' || f.nome || ')', ''),
                      E'\n' order by ev.inicio) as lista,
           bool_or(s.status = 'pendente') as tem_pendente
    from escalas s
    join eventos ev on ev.id = s.evento_id and not ev.so_agenda
    join pessoas p on p.id = s.pessoa_id
    join escalas_ministerio em on em.evento_id = s.evento_id and em.ministerio_id = s.ministerio_id and em.publicada
    left join funcoes f on f.id = s.funcao_id
    where (ev.inicio at time zone 'America/Sao_Paulo')::date = amanha
      and s.status in ('pendente', 'confirmado')
    group by s.pessoa_id, p.nome
  loop
    chave := 'lembrete:' || r.pessoa_id || ':' || amanha;
    fecho := case when r.tem_pendente
      then 'Ainda falta confirmar sua presença: https://maisconectados.com.br'
      else 'Sua presença já está confirmada. Se algo mudar, avise pelo app.' end;
    if enfileirar_whatsapp(r.pessoa_id, 'lembrete', chave,
      case abs(hashtext(chave)) % 2
        when 0 then 'Oi, ' || r.nome || '! Lembrete: amanhã você serve na igreja.' || E'\n' || r.lista || E'\n' || fecho
        else r.nome || ', passando para lembrar da sua escala de amanhã:' || E'\n' || r.lista || E'\n' || fecho
      end) then
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- Funções internas: só o servidor (service role) e os gatilhos usam. Ninguém logado chama direto.
revoke execute on function enfileirar_whatsapp(uuid, text, text, text) from public, authenticated, anon;
revoke execute on function rotulo_evento_whatsapp(uuid) from public, authenticated, anon;
revoke execute on function enfileirar_lembretes() from public, authenticated, anon;
revoke execute on function tg_whatsapp_chegada() from public, authenticated, anon;
revoke execute on function tg_whatsapp_troca() from public, authenticated, anon;
revoke execute on function tg_whatsapp_publicada() from public, authenticated, anon;

-- Tela de voluntários: o coordenador passa a ver (e corrigir) o celular de quem coordena, para saber quem fica sem aviso.
drop function dados_do_time();
create function dados_do_time()
returns table (pessoa_id uuid, nome text, email text, aniversario date, conectado boolean, celular text)
language sql stable security definer set search_path = public as $$
  select distinct p.id, p.nome, p.email, p.aniversario, (p.auth_user_id is not null), p.celular
  from pessoas p
  join membros_ministerio mm on mm.pessoa_id = p.id
  where p.ativo and sou_coordenador(mm.ministerio_id)
$$;
revoke all on function dados_do_time() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function dados_do_time() to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function dados_do_time() from anon';
  end if;
end $$;
