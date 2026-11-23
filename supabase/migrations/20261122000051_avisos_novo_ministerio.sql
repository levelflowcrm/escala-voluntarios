-- =============================================================================
-- Avisos dentro do app (sino) e por push, sem WhatsApp, quando alguém passa a
-- servir em mais de um ministério (nível 2 do docs/AVISOS.md).
--
--   * notificacoes: avisos de cada pessoa (lista na tela Comunicados; o sino conta os não lidos).
--     Só a própria pessoa lê; ninguém grava direto (só as funções abaixo).
--   * Quando a pessoa é adicionada a OUTRO ministério:
--       - o facilitador de cada ministério em que ela já serve é avisado
--         (menos quem também coordena o ministério novo, que foi quem adicionou);
--       - a própria pessoa é avisada.
--   * Quando um ministério PUBLICA a escala com alguém que também serve em outro ministério,
--     os facilitadores desse outro ministério são avisados (no máximo 1 aviso por pessoa por hora).
--   * push_enviado_em: o push do app usa a mesma coluna da fila para não repetir.
-- =============================================================================
create table notificacoes (
  id               uuid primary key default gen_random_uuid(),
  pessoa_id        uuid not null references pessoas(id) on delete cascade,
  tipo             text not null,
  chave            text not null unique,
  texto            text not null check (length(texto) between 1 and 400),
  url              text not null default '/comunicados',
  criado_em        timestamptz not null default now(),
  lido_em          timestamptz,
  push_enviado_em  timestamptz
);
create index notificacoes_por_pessoa on notificacoes (pessoa_id, criado_em desc);
create index notificacoes_nao_lidas on notificacoes (pessoa_id) where lido_em is null;
create index notificacoes_push_pendentes on notificacoes (criado_em) where push_enviado_em is null;
alter table notificacoes enable row level security;
create policy propria_leitura on notificacoes for select using (pessoa_id = minha_pessoa());
revoke all on notificacoes from anon, authenticated;

-- Interna: cria o aviso (ignora quem está inativo; a "chave" evita repetir).
create function criar_notificacao(p_pessoa uuid, p_tipo text, p_chave text, p_texto text, p_url text default '/comunicados')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pessoas where id = p_pessoa and ativo) then return; end if;
  insert into notificacoes (pessoa_id, tipo, chave, texto, url) values (p_pessoa, p_tipo, p_chave, left(p_texto, 400), p_url)
  on conflict (chave) do nothing;
end $$;

-- A pessoa abriu a tela de avisos: marca os dela como lidos.
create function marcar_notificacoes_lidas()
returns void
language sql security definer set search_path = public as $$
  update notificacoes set lido_em = now() where pessoa_id = minha_pessoa() and lido_em is null
$$;

-- Adicionada a outro ministério
create function tg_notifica_novo_ministerio()
returns trigger
language plpgsql security definer set search_path = public as $$
declare quem text; mnome text; outros int; r record;
begin
  select count(*) into outros from membros_ministerio where pessoa_id = new.pessoa_id and ministerio_id <> new.ministerio_id;
  if outros = 0 then return new; end if;
  select nome into quem from pessoas where id = new.pessoa_id;
  select nome into mnome from ministerios where id = new.ministerio_id;

  for r in
    select distinct f.pessoa_id
      from membros_ministerio m
      join membros_ministerio f on f.ministerio_id = m.ministerio_id and f.papel = 'coordenador'
     where m.pessoa_id = new.pessoa_id and m.ministerio_id <> new.ministerio_id
       and f.pessoa_id <> new.pessoa_id
       and not exists (select 1 from membros_ministerio c
                        where c.pessoa_id = f.pessoa_id and c.ministerio_id = new.ministerio_id and c.papel = 'coordenador')
  loop
    perform criar_notificacao(r.pessoa_id, 'novo_ministerio',
      'novo-ministerio:' || new.pessoa_id || ':' || new.ministerio_id || ':' || r.pessoa_id,
      quem || ', do seu time, também foi adicionado(a) ao ministério ' || mnome || '.');
  end loop;

  perform criar_notificacao(new.pessoa_id, 'novo_ministerio_voluntario',
    'novo-ministerio-voluntario:' || new.pessoa_id || ':' || new.ministerio_id,
    'Você agora também faz parte do ministério ' || mnome || '.', '/');
  return new;
end $$;
create trigger notifica_novo_ministerio after insert on membros_ministerio
  for each row execute function tg_notifica_novo_ministerio();

-- Escala publicada com alguém que também serve em outro ministério
create function tg_notifica_escalado_em_outro()
returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; f record; mnome text; hora text;
begin
  if not new.publicada or old.publicada then return new; end if;
  select nome into mnome from ministerios where id = new.ministerio_id;
  hora := to_char(now() at time zone 'America/Sao_Paulo', 'YYYYMMDDHH24');
  for r in
    select distinct s.pessoa_id, p.nome
      from escalas s join pessoas p on p.id = s.pessoa_id
     where s.evento_id = new.evento_id and s.ministerio_id = new.ministerio_id
       and s.status in ('pendente', 'confirmado')
  loop
    for f in
      select distinct c.pessoa_id
        from membros_ministerio m
        join membros_ministerio c on c.ministerio_id = m.ministerio_id and c.papel = 'coordenador'
       where m.pessoa_id = r.pessoa_id and m.ministerio_id <> new.ministerio_id
         and c.pessoa_id <> r.pessoa_id
         and not exists (select 1 from membros_ministerio x
                          where x.pessoa_id = c.pessoa_id and x.ministerio_id = new.ministerio_id and x.papel = 'coordenador')
    loop
      perform criar_notificacao(f.pessoa_id, 'escalado_outro_ministerio',
        'escalado-outro:' || new.ministerio_id || ':' || r.pessoa_id || ':' || f.pessoa_id || ':' || hora,
        r.nome || ', do seu time, foi escalado(a) em ' || mnome || '. Confira antes de montar a sua escala.', '/montar');
    end loop;
  end loop;
  return new;
end $$;
create trigger notifica_escalado_em_outro after update of publicada on escalas_ministerio
  for each row execute function tg_notifica_escalado_em_outro();

revoke execute on function tg_notifica_novo_ministerio(), tg_notifica_escalado_em_outro() from public, authenticated, anon;
revoke all on function criar_notificacao(uuid, text, text, text, text), marcar_notificacoes_lidas() from public, authenticated, anon;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on notificacoes to authenticated';
    execute 'grant execute on function marcar_notificacoes_lidas() to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function marcar_notificacoes_lidas() from anon';
  end if;
end $$;
