-- =============================================================================
-- Foto de perfil + felicitação de aniversário.
--   * fotos_perfil: uma foto por pessoa, já reduzida pelo app (JPEG ~320px, em texto base64).
--     Só a própria pessoa lê e grava (nada de foto de colega por enquanto).
--   * enfileirar_aniversarios(): às 9h (rotina diária) enfileira UM WhatsApp de parabéns para quem
--     faz aniversário hoje (29/02 comemora em 28/02 nos anos não bissextos), uma vez por ano.
-- =============================================================================
create table fotos_perfil (
  pessoa_id      uuid primary key references pessoas(id) on delete cascade,
  foto           text not null check (foto like 'data:image/jpeg;base64,%' and length(foto) <= 200000),
  atualizado_em  timestamptz not null default now()
);
alter table fotos_perfil enable row level security;
create policy fotos_perfil_propria on fotos_perfil for all to authenticated
  using (pessoa_id = minha_pessoa()) with check (pessoa_id = minha_pessoa());

create function enfileirar_aniversarios()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; hoje date := (now() at time zone 'America/Sao_Paulo')::date; chave text; ano int := extract(year from hoje);
  bissexto boolean := (ano % 4 = 0 and ano % 100 <> 0) or ano % 400 = 0;
begin
  for r in
    select p.id, split_part(p.nome, ' ', 1) as primeiro from pessoas p
    where p.ativo and p.aniversario is not null
      and (
        (extract(month from p.aniversario) = extract(month from hoje) and extract(day from p.aniversario) = extract(day from hoje))
        or (not bissexto and extract(month from p.aniversario) = 2 and extract(day from p.aniversario) = 29
            and extract(month from hoje) = 2 and extract(day from hoje) = 28)
      )
  loop
    chave := 'aniversario:' || r.id || ':' || ano;
    if enfileirar_whatsapp(r.id, 'aniversario', chave,
      case abs(hashtext(chave)) % 2
        when 0 then 'Parabéns, ' || r.primeiro || '! 🎂🎉 Hoje a igreja agradece a Deus pela sua vida e por você servir com a gente. Abra o app, tem uma surpresa para você: https://maisconectados.com.br'
        else r.primeiro || ', feliz aniversário! 🎈 Que Deus abençoe muito o seu novo ano. Passa no app, preparamos uma homenagem para você: https://maisconectados.com.br'
      end) then
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke execute on function enfileirar_aniversarios() from public, authenticated, anon;
