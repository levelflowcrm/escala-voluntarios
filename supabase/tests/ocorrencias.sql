-- Ocorrências: voluntário do ministério registra, facilitador recebe (app + WhatsApp) e acompanha;
-- ninguém de fora vê; o relato não muda nem some.
\set ON_ERROR_STOP 1

do $$
declare tm uuid; ig uuid; ev uuid; coord uuid; vol uuid; fora uuid;
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into coord from pessoas where nome = 'Sérgio';
  select id into vol from pessoas where nome = 'Diogo';
  select id into fora from pessoas where nome = 'Josy';
  update pessoas set auth_user_id = u1, celular = '(11) 95402-5001' where id = coord;
  update pessoas set auth_user_id = u2, celular = '(11) 95402-5002' where id = vol;
  update pessoas set auth_user_id = u3 where id = fora;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (coord, tm, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (vol, tm, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'voluntario';
  delete from membros_ministerio where pessoa_id = fora and ministerio_id = tm;
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto ocorrência', now() - interval '1 hour') returning id into ev;
  delete from fila_whatsapp;
  perform set_config('test.coord', u1::text, false);
  perform set_config('test.vol', u2::text, false);
  perform set_config('test.fora', u3::text, false);
  perform set_config('test.tm', tm::text, false);
  perform set_config('test.ev', ev::text, false);
  perform set_config('test.volid', vol::text, false);
  perform set_config('test.foraid', fora::text, false);
  perform set_config('test.coordid', coord::text, false);
end $$;

set role authenticated;

-- 1) Voluntário registra
select set_config('request.jwt.claim.sub', current_setting('test.vol'), false);
insert into ocorrencias (ministerio_id, evento_id, autor_id, tipo, gravidade, texto)
values (current_setting('test.tm')::uuid, current_setting('test.ev')::uuid, current_setting('test.volid')::uuid,
        'tecnico', 'urgente', 'O sinal do YouTube caiu na ministração por 3 minutos');
do $$
declare n int;
begin
  -- não registra em nome de outro
  begin
    insert into ocorrencias (ministerio_id, autor_id, tipo, texto)
    values (current_setting('test.tm')::uuid, current_setting('test.foraid')::uuid, 'outro', 'X');
    raise exception 'FALHOU: registrou em nome de outra pessoa';
  exception when insufficient_privilege then null; end;
  -- não registra já resolvida
  begin
    insert into ocorrencias (ministerio_id, autor_id, tipo, texto, status)
    values (current_setting('test.tm')::uuid, current_setting('test.volid')::uuid, 'outro', 'X', 'resolvida');
    raise exception 'FALHOU: registrou já resolvida';
  exception when insufficient_privilege then null; end;
  -- vê a própria
  select count(*) into n from ocorrencias;
  if n <> 1 then raise exception 'FALHOU: voluntário deveria ver 1 ocorrência (%)', n; end if;
  -- não muda o status nem o texto da própria
  update ocorrencias set status = 'resolvida';
  update ocorrencias set texto = 'mudei';
  if exists (select 1 from ocorrencias where status <> 'aberta' or texto = 'mudei') then
    raise exception 'FALHOU: voluntário alterou a ocorrência';
  end if;
  -- não apaga
  delete from ocorrencias;
  select count(*) into n from ocorrencias;
  if n <> 1 then raise exception 'FALHOU: voluntário apagou a ocorrência'; end if;
  raise notice 'Ocorrências: voluntário registra e não altera OK';
end $$;

-- 2) Quem não é do ministério não registra nem vê
select set_config('request.jwt.claim.sub', current_setting('test.fora'), false);
do $$
begin
  begin
    insert into ocorrencias (ministerio_id, autor_id, tipo, texto)
    values (current_setting('test.tm')::uuid, current_setting('test.foraid')::uuid, 'outro', 'X');
    raise exception 'FALHOU: pessoa de fora registrou';
  exception when insufficient_privilege then null; end;
  if (select count(*) from ocorrencias) <> 0 then raise exception 'FALHOU: pessoa de fora vê ocorrências'; end if;
  raise notice 'Ocorrências: fora do ministério sem acesso OK';
end $$;

-- 3) Facilitador vê, responde e resolve; não altera o relato
select set_config('request.jwt.claim.sub', current_setting('test.coord'), false);
do $$
declare o record;
begin
  if (select count(*) from ocorrencias) <> 1 then raise exception 'FALHOU: facilitador deveria ver 1'; end if;
  update ocorrencias set status = 'ciente';
  update ocorrencias set status = 'resolvida', resposta = 'Trocamos o cabo de rede';
  select * into o from ocorrencias;
  if o.status <> 'resolvida' or o.resposta <> 'Trocamos o cabo de rede' then
    raise exception 'FALHOU: facilitador não conseguiu resolver';
  end if;
  if o.tratado_por <> current_setting('test.coordid')::uuid or o.tratado_em is null then
    raise exception 'FALHOU: não registrou quem tratou';
  end if;
  begin
    update ocorrencias set texto = 'reescrito';
    raise exception 'FALHOU: facilitador reescreveu o relato';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  delete from ocorrencias;
  if (select count(*) from ocorrencias) <> 1 then raise exception 'FALHOU: facilitador apagou'; end if;
  raise notice 'Ocorrências: facilitador acompanha e responde OK';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- 4) WhatsApp: cada facilitador do ministério (com celular) recebe; quem registrou não
do $$
declare n int; esperado int; txt text;
begin
  select count(*) into esperado from membros_ministerio mm join pessoas p on p.id = mm.pessoa_id
   where mm.ministerio_id = current_setting('test.tm')::uuid and mm.papel = 'coordenador' and p.ativo
     and length(regexp_replace(coalesce(p.celular, ''), '\D', '', 'g')) between 10 and 13;
  select count(*) into n from fila_whatsapp where tipo = 'ocorrencia';
  if esperado < 1 or n <> esperado then raise exception 'FALHOU: avisos % (esperado %)', n, esperado; end if;
  if exists (select 1 from fila_whatsapp f where f.tipo = 'ocorrencia' and not exists (
       select 1 from membros_ministerio mm where mm.pessoa_id = f.pessoa_id
          and mm.ministerio_id = current_setting('test.tm')::uuid and mm.papel = 'coordenador')) then
    raise exception 'FALHOU: aviso foi para quem não é facilitador';
  end if;
  if exists (select 1 from fila_whatsapp where tipo = 'ocorrencia' and pessoa_id = current_setting('test.volid')::uuid) then
    raise exception 'FALHOU: quem registrou recebeu o próprio aviso';
  end if;
  select texto into txt from fila_whatsapp where tipo = 'ocorrencia' and pessoa_id = current_setting('test.coordid')::uuid;
  if txt not like '%URGENTE%' or txt not like '%Culto ocorrência%' or txt not like '%sinal do YouTube%' or txt not like '%/ocorrencias%' then
    raise exception 'FALHOU: texto do aviso inesperado: %', txt;
  end if;
  raise notice 'Ocorrências: aviso por WhatsApp aos facilitadores OK (%)', n;
end $$;

-- Limpeza
delete from fila_whatsapp where tipo = 'ocorrencia';
delete from ocorrencias;
delete from eventos where titulo = 'Culto ocorrência';
update pessoas set auth_user_id = null where nome in ('Sérgio', 'Diogo', 'Josy');

-- Tipos amplos: aceita os novos e recusa o antigo "transmissao"
do $$
declare tm uuid; p uuid;
begin
  select id into tm from ministerios where nome = 'Transmissão';
  select id into p from pessoas where nome = 'Diogo';
  insert into ocorrencias (igreja_id, ministerio_id, autor_id, tipo, texto)
  select igreja_id, tm, p, t, 'teste' from ministerios, unnest(array['equipamento','tecnico','equipe','pessoas','seguranca','estrutura','programacao','outro']) t
  where ministerios.id = tm;
  begin
    insert into ocorrencias (igreja_id, ministerio_id, autor_id, tipo, texto)
    select igreja_id, tm, p, 'transmissao', 'teste' from ministerios where id = tm;
    raise exception 'FALHOU: aceitou o tipo antigo';
  exception when check_violation then null; end;
  delete from ocorrencias;
  delete from fila_whatsapp where tipo = 'ocorrencia';
  raise notice 'Ocorrências: tipos amplos OK';
end $$;

-- Cada ministério avisa só o próprio facilitador
do $$
declare pj uuid; tm uuid; fac_pj uuid; vol_pj uuid; n_pj int; n_tm int;
begin
  select id into pj from ministerios where nome = 'Projeção';
  select id into tm from ministerios where nome = 'Transmissão';
  select id into fac_pj from pessoas where nome = 'Marcos';
  select id into vol_pj from pessoas where nome = 'Wesley';
  update pessoas set celular = '(11) 95402-5009' where id = fac_pj;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (fac_pj, pj, 'coordenador')
    on conflict (pessoa_id, ministerio_id) do update set papel = 'coordenador';
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (vol_pj, pj, 'voluntario')
    on conflict (pessoa_id, ministerio_id) do nothing;
  delete from fila_whatsapp;
  insert into ocorrencias (igreja_id, ministerio_id, autor_id, tipo, texto)
  select igreja_id, pj, vol_pj, 'equipamento', 'O projetor desligou' from ministerios where id = pj;
  select count(*) into n_pj from fila_whatsapp f
   where f.tipo = 'ocorrencia' and f.pessoa_id = fac_pj and f.texto like '%Projeção%';
  select count(*) into n_tm from fila_whatsapp f
   where f.tipo = 'ocorrencia' and exists (select 1 from membros_ministerio mm
     where mm.pessoa_id = f.pessoa_id and mm.ministerio_id = tm and mm.papel = 'coordenador')
     and not exists (select 1 from membros_ministerio mm
     where mm.pessoa_id = f.pessoa_id and mm.ministerio_id = pj and mm.papel = 'coordenador');
  if n_pj <> 1 then raise exception 'FALHOU: facilitador da Projeção não recebeu (%)', n_pj; end if;
  if n_tm <> 0 then raise exception 'FALHOU: facilitador da Transmissão recebeu ocorrência da Projeção'; end if;
  delete from ocorrencias;
  delete from fila_whatsapp where tipo = 'ocorrencia';
  delete from membros_ministerio where pessoa_id = fac_pj and ministerio_id = pj and papel = 'coordenador';
  raise notice 'Ocorrências: cada ministério avisa o próprio facilitador OK';
end $$;
