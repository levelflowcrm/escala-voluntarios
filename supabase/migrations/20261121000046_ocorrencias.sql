-- =============================================================================
-- Ocorrências: o voluntário registra o que aconteceu no culto (equipamento que
-- falhou, queda de sinal, falta de alguém...) e o facilitador do ministério recebe.
--
--   * Sempre identificada (é um registro do ministério, não uma sugestão anônima).
--   * Ligada ao evento em que aconteceu (opcional) e ao ministério.
--   * Tipo e gravidade para o facilitador priorizar.
--   * O relato não pode ser editado nem apagado: fica como histórico.
--     O facilitador só acompanha (aberta → ciente → resolvida) e responde.
--   * Ao registrar, cada facilitador do ministério recebe um WhatsApp (fila).
-- =============================================================================
create table ocorrencias (
  id             uuid primary key default gen_random_uuid(),
  igreja_id      uuid not null default minha_igreja() references igrejas(id) on delete cascade,
  ministerio_id  uuid not null references ministerios(id) on delete cascade,
  evento_id      uuid references eventos(id) on delete set null,
  autor_id       uuid not null references pessoas(id) on delete cascade,
  tipo           text not null check (tipo in ('equipamento', 'transmissao', 'equipe', 'outro')),
  gravidade      text not null default 'normal' check (gravidade in ('informativa', 'normal', 'urgente')),
  texto          text not null check (length(trim(texto)) between 1 and 2000),
  status         text not null default 'aberta' check (status in ('aberta', 'ciente', 'resolvida')),
  resposta       text check (resposta is null or length(resposta) <= 1000),
  tratado_por    uuid references pessoas(id) on delete set null,
  tratado_em     timestamptz,
  criado_em      timestamptz not null default now()
);
create index ocorrencias_por_ministerio on ocorrencias (ministerio_id, criado_em desc);
create index ocorrencias_por_autor on ocorrencias (autor_id, criado_em desc);

alter table ocorrencias enable row level security;

-- Vê: o facilitador do ministério e o próprio autor
create policy leitura on ocorrencias for select using (
  igreja_id = minha_igreja()
  and (sou_coordenador(ministerio_id) or autor_id = minha_pessoa()));

-- Registra: quem é do ministério, sempre em nome de si mesmo, como "aberta"
create policy registra on ocorrencias for insert with check (
  igreja_id = minha_igreja()
  and autor_id = minha_pessoa()
  and status = 'aberta' and resposta is null and tratado_por is null and tratado_em is null
  and exists (select 1 from membros_ministerio mm
              where mm.ministerio_id = ocorrencias.ministerio_id and mm.pessoa_id = minha_pessoa())
  and (evento_id is null or exists (select 1 from eventos e where e.id = evento_id and e.igreja_id = minha_igreja())));

-- Facilitador acompanha (sem política de delete: o histórico fica)
create policy facilitador_atualiza on ocorrencias for update
  using (sou_coordenador(ministerio_id)) with check (sou_coordenador(ministerio_id));

-- No update, só mudam status e resposta; quem tratou e quando são preenchidos aqui.
create function tg_ocorrencia_protege()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.igreja_id <> old.igreja_id or new.ministerio_id <> old.ministerio_id
     or new.evento_id is distinct from old.evento_id or new.autor_id <> old.autor_id
     or new.tipo <> old.tipo or new.gravidade <> old.gravidade or new.texto <> old.texto
     or new.criado_em <> old.criado_em then
    raise exception 'O relato da ocorrência não pode ser alterado';
  end if;
  if new.status is distinct from old.status or new.resposta is distinct from old.resposta then
    new.tratado_por := minha_pessoa();
    new.tratado_em := now();
  else
    new.tratado_por := old.tratado_por;
    new.tratado_em := old.tratado_em;
  end if;
  return new;
end;
$$;
create trigger ocorrencias_protege before update on ocorrencias
  for each row execute function tg_ocorrencia_protege();
revoke execute on function tg_ocorrencia_protege() from public, authenticated, anon;

-- Avisa os facilitadores do ministério pelo WhatsApp (quem registrou não recebe o próprio aviso).
create function tg_whatsapp_ocorrencia()
returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; autor text; ministerio text; onde text; resumo text; alerta text;
begin
  select split_part(nome, ' ', 1) into autor from pessoas where id = new.autor_id;
  select nome into ministerio from ministerios where id = new.ministerio_id;
  onde := case when new.evento_id is null then '' else ' em ' || rotulo_evento_whatsapp(new.evento_id) end;
  resumo := case when length(new.texto) > 280 then left(new.texto, 277) || '...' else new.texto end;
  alerta := case new.gravidade when 'urgente' then '🚨 Ocorrência URGENTE' when 'informativa' then 'ℹ️ Ocorrência' else '⚠️ Ocorrência' end;
  for c in
    select mm.pessoa_id from membros_ministerio mm
    where mm.ministerio_id = new.ministerio_id and mm.papel = 'coordenador' and mm.pessoa_id <> new.autor_id
  loop
    perform enfileirar_whatsapp(c.pessoa_id, 'ocorrencia', 'ocorrencia:' || new.id || ':' || c.pessoa_id,
      alerta || ' (' || ministerio || ')' || onde || E'\n' || autor || ' registrou: "' || resumo || '"'
      || E'\nVer e responder: https://maisconectados.com.br/ocorrencias');
  end loop;
  return new;
end;
$$;
create trigger whatsapp_ocorrencia after insert on ocorrencias
  for each row execute function tg_whatsapp_ocorrencia();
revoke execute on function tg_whatsapp_ocorrencia() from public, authenticated, anon;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on ocorrencias from anon';
  end if;
end $$;
