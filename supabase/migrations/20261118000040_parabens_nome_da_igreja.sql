-- Parabéns por WhatsApp: "a igreja agradece" passa a "a <nome da igreja> agradece" (ex.: "A Nasci Pra Deus agradece").
create or replace function enfileirar_aniversarios()
returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; hoje date := (now() at time zone 'America/Sao_Paulo')::date; chave text; ano int := extract(year from hoje);
  bissexto boolean := (ano % 4 = 0 and ano % 100 <> 0) or ano % 400 = 0;
begin
  for r in
    select p.id, split_part(p.nome, ' ', 1) as primeiro, regexp_replace(coalesce(i.nome, 'sua igreja'), '^Igreja\s+', '') as igreja from pessoas p left join igrejas i on i.id = p.igreja_id
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
        when 0 then 'Parabéns, ' || r.primeiro || '! 🎂🎉 Hoje a ' || r.igreja || ' agradece a Deus pela sua vida e por você servir com a gente. Abra o app, tem uma surpresa para você: https://maisconectados.com.br'
        else r.primeiro || ', feliz aniversário! 🎈 Que Deus abençoe muito o seu novo ano. Passa no app, preparamos uma homenagem para você: https://maisconectados.com.br'
      end) then
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
