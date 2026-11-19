-- Texto da boas-vindas por WhatsApp: "coordenação" passa a "facilitador" (mesma lógica da migração 25).
create or replace function tg_whatsapp_boas_vindas()
returns trigger
language plpgsql security definer set search_path = public as $$
declare primeiro text; chave text; igreja text; texto text;
  tinha boolean; tem boolean;
begin
  tem := length(regexp_replace(coalesce(new.celular, ''), '\D', '', 'g')) between 10 and 13;
  tinha := tg_op = 'UPDATE'
    and length(regexp_replace(coalesce(old.celular, ''), '\D', '', 'g')) between 10 and 13;
  if not tem or tinha or not new.ativo then return new; end if;

  primeiro := split_part(new.nome, ' ', 1);
  select coalesce(i.nome, 'sua igreja') into igreja from igrejas i where i.id = new.igreja_id;
  igreja := coalesce(igreja, 'sua igreja');
  chave := 'boas-vindas:' || new.id;

  if new.auth_user_id is null then
    texto := 'Oi, ' || primeiro || '! 👋 Aqui é o Mais Conectados, o app de escalas da ' || igreja || '.' || E'\n\n'
      || 'Seu número foi cadastrado pelo facilitador do seu ministério e é por aqui que você vai receber lembretes de escala, avisos de troca e comunicados.' || E'\n\n'
      || 'Para ver suas escalas e confirmar presença, entre com o Google usando o mesmo e-mail que o seu facilitador cadastrou: https://maisconectados.com.br' || E'\n'
      || 'Dica: no celular dá para instalar na tela inicial, como um app.' || E'\n\n'
      || 'Se este número não for seu ou você não quiser receber os avisos, é só falar com o seu facilitador.';
  else
    texto := 'Oi, ' || primeiro || '! 👋 Aqui é o Mais Conectados.' || E'\n\n'
      || 'Seu celular foi cadastrado, e agora você também recebe por aqui os lembretes de escala, avisos de troca e comunicados da ' || igreja || '.' || E'\n\n'
      || 'Se este número não for seu ou você não quiser receber os avisos, é só falar com o seu facilitador.';
  end if;

  perform enfileirar_whatsapp(new.id, 'boas_vindas', chave, texto);
  return new;
end;
$$;
