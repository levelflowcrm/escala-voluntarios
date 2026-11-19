-- Foto de perfil: só a própria pessoa lê/grava, só JPEG pequeno. Aniversário: WhatsApp 1x por ano, só para quem faz hoje.
\set ON_ERROR_STOP 1
do $$
declare
  d uuid; k uuid; c uuid; n int; txt text; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  ud uuid := gen_random_uuid(); uk uuid := gen_random_uuid();
  jpeg text := 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
begin
  select id into d from pessoas where nome = 'Diogo';
  select id into k from pessoas where nome = 'Marcos';
  select id into c from pessoas where nome = 'Thamires';
  update pessoas set auth_user_id = ud, celular = '(11) 95402-4101', aniversario = make_date(1990, extract(month from hoje)::int, extract(day from hoje)::int) where id = d;
  update pessoas set auth_user_id = uk, celular = '(11) 95402-4102', aniversario = (hoje + 40) - interval '30 years' where id = k;
  update pessoas set celular = '(11) 95402-4103', aniversario = null where id = c;
  delete from fila_whatsapp;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ud::text, true);
  insert into fotos_perfil (pessoa_id, foto) values (d, jpeg);
  begin insert into fotos_perfil (pessoa_id, foto) values (k, jpeg); raise exception 'FALHOU: gravou foto de outra pessoa';
  exception when insufficient_privilege or check_violation then null; end;
  begin update fotos_perfil set foto = 'data:text/html;base64,AAAA' where pessoa_id = d; raise exception 'FALHOU: aceitou arquivo que não é JPEG';
  exception when check_violation then null; end;
  begin update fotos_perfil set foto = 'data:image/jpeg;base64,' || repeat('A', 200000) where pessoa_id = d; raise exception 'FALHOU: aceitou foto gigante';
  exception when check_violation then null; end;
  update fotos_perfil set foto = jpeg || 'AA' where pessoa_id = d;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: não trocou a própria foto'; end if;

  perform set_config('request.jwt.claim.sub', uk::text, true);
  select count(*) into n from fotos_perfil;
  if n <> 0 then raise exception 'FALHOU: enxergou a foto de outra pessoa'; end if;
  begin perform enfileirar_aniversarios(); raise exception 'FALHOU: voluntário chamou a rotina de aniversários';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Aniversário de hoje: só o Diogo; uma vez por ano
  select enfileirar_aniversarios() into n;
  if n <> 1 then raise exception 'FALHOU: deveria avisar só 1 aniversariante (%)', n; end if;
  select texto into txt from fila_whatsapp where tipo = 'aniversario' and pessoa_id = d;
  if txt is null or txt not like '%Diogo%' then raise exception 'FALHOU: texto de parabéns inesperado (%)', txt; end if;
  if exists (select 1 from fila_whatsapp where tipo = 'aniversario' and pessoa_id in (k, c)) then raise exception 'FALHOU: avisou quem não faz aniversário hoje'; end if;
  select enfileirar_aniversarios() into n;
  if n <> 0 then raise exception 'FALHOU: repetiu o parabéns no mesmo ano (%)', n; end if;

  update pessoas set auth_user_id = null where id in (d, k);
  raise notice 'Foto e aniversário: OK';
end $$;
