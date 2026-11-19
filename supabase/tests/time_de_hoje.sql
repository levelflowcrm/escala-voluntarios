-- Time de hoje: só colegas do mesmo ministério e evento, escala publicada e ativa; foto só aparece aí.
\set ON_ERROR_STOP 1
do $$
declare
  tm uuid; pj uuid; f uuid; f2 uuid; f3 uuid; ig uuid; ev uuid; ev_rasc uuid; a uuid; b uuid; c uuid; d uuid; n int;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid();
  jpeg text := 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
  r record;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into pj from ministerios where nome = 'Projeção';
  select id into f from funcoes where nome = 'Câmera Black';
  select id into f2 from funcoes where nome = 'Câmera Grua';
  select id into f3 from funcoes where ministerio_id = tm and id not in (f, f2) limit 1;
  select id into a from pessoas where nome = 'Sérgio';
  select id into b from pessoas where nome = 'Diogo';
  select id into c from pessoas where nome = 'Marcos';
  select id into d from pessoas where nome = 'Thamires';
  update pessoas set auth_user_id = ua where id = a;
  update pessoas set auth_user_id = ub where id = b;
  update pessoas set auth_user_id = uc where id = c;
  update pessoas set auth_user_id = ud where id = d;

  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto time', now() + interval '2 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, tm, true), (ev, pj, true);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values
    (ev, tm, f, a, 'confirmado'), (ev, tm, f2, b, 'pendente'), (ev, tm, f3, d, 'recusado');
  -- C serve em outro ministério no mesmo culto
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status)
    select ev, pj, (select id from funcoes where ministerio_id = pj limit 1), c, 'confirmado';
  -- Rascunho: Diogo e Sérgio em evento não publicado
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto rascunho time', now() + interval '3 hours') returning id into ev_rasc;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev_rasc, tm, false);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev_rasc, tm, f, a, 'confirmado'), (ev_rasc, tm, f2, b, 'confirmado');

  update pessoas set aniversario = (current_date - interval '30 years') where id = b;
  delete from fotos_perfil where pessoa_id in (a, b);
  insert into fotos_perfil (pessoa_id, foto, miniatura) values (b, jpeg || 'GRANDE', jpeg || 'MINI');
  insert into fotos_perfil (pessoa_id, foto) values (a, jpeg || 'SOA');

  set local role authenticated;
  -- Sérgio vê Diogo (e a si mesmo), nunca Marcos (outro ministério), Thamires (recusou) nem o rascunho
  perform set_config('request.jwt.claim.sub', ua::text, true);
  select count(*) into n from time_de_hoje();
  if n <> 2 then raise exception 'FALHOU: Sérgio deveria ver 2 pessoas (ele e o Diogo), viu %', n; end if;
  select * into r from time_de_hoje() where pessoa_id = b;
  if r.foto <> jpeg || 'MINI' then raise exception 'FALHOU: deveria usar a miniatura (%)', r.foto; end if;
  if r.status <> 'pendente' or r.sou_eu then raise exception 'FALHOU: dados do colega errados'; end if;
  select * into r from time_de_hoje() where pessoa_id = a;
  if not r.sou_eu or r.foto <> jpeg || 'SOA' then raise exception 'FALHOU: sem miniatura deveria usar a foto'; end if;
  if exists (select 1 from time_de_hoje() where evento = 'Culto rascunho time') then raise exception 'FALHOU: mostrou time de escala não publicada'; end if;
  if exists (select 1 from time_de_hoje() where pessoa_id in (c, d)) then raise exception 'FALHOU: mostrou quem é de outro ministério ou recusou'; end if;

  -- Marcos (outro ministério) vê só a si; Thamires (recusou) não vê nada
  perform set_config('request.jwt.claim.sub', uc::text, true);
  select count(*) into n from time_de_hoje();
  if n <> 1 then raise exception 'FALHOU: Marcos deveria ver só ele mesmo, viu %', n; end if;
  perform set_config('request.jwt.claim.sub', ud::text, true);
  select count(*) into n from time_de_hoje();
  if n <> 0 then raise exception 'FALHOU: quem recusou não deveria ver o time, viu %', n; end if;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  update pessoas set auth_user_id = null where id in (a, b, c, d);
  raise notice 'Time de hoje: OK';
end $$;
