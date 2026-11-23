-- Avisos quando alguém passa a servir em mais de um ministério (sino + push, sem WhatsApp).
\set ON_ERROR_STOP 1
do $$
declare
  tm uuid; pj uuid; ig uuid; ev uuid; f uuid;
  fc uuid; fp uuid; v uuid; solo uuid;
  uv uuid := gen_random_uuid(); n int;
begin
  select id, igreja_id into tm, ig from ministerios where nome = 'Transmissão';
  select id into pj from ministerios where nome = 'Projeção';
  select id into f from funcoes where nome = 'Holyrics';
  insert into pessoas (igreja_id, nome) values (ig, 'Facilitadora Transmissão Teste') returning id into fc;
  insert into pessoas (igreja_id, nome) values (ig, 'Facilitador Projeção Teste') returning id into fp;
  insert into pessoas (igreja_id, nome) values (ig, 'Voluntária Dupla Teste') returning id into v;
  insert into pessoas (igreja_id, nome) values (ig, 'Voluntário Só Teste') returning id into solo;
  update pessoas set auth_user_id = uv where id = v;
  insert into membros_ministerio (pessoa_id, ministerio_id, papel) values (fc, tm, 'coordenador'), (fp, pj, 'coordenador');

  -- Primeiro ministério da pessoa: ninguém é avisado
  insert into membros_ministerio (pessoa_id, ministerio_id) values (v, tm), (solo, tm);
  select count(*) into n from notificacoes where pessoa_id in (fc, fp, v, solo);
  if n <> 0 then raise exception 'FALHOU: avisou no primeiro ministério (%)', n; end if;

  -- Adicionada à Projeção: o facilitador da Transmissão e a própria pessoa são avisados; quem adicionou (Projeção), não
  insert into membros_ministerio (pessoa_id, ministerio_id) values (v, pj);
  if not exists (select 1 from notificacoes where pessoa_id = fc and tipo = 'novo_ministerio' and texto like '%Voluntária Dupla Teste%Projeção%') then
    raise exception 'FALHOU: facilitador do outro ministério não foi avisado';
  end if;
  if not exists (select 1 from notificacoes where pessoa_id = v and tipo = 'novo_ministerio_voluntario' and texto like '%Projeção%') then
    raise exception 'FALHOU: a própria pessoa não foi avisada';
  end if;
  if exists (select 1 from notificacoes where pessoa_id = fp) then raise exception 'FALHOU: avisou quem adicionou'; end if;
  if exists (select 1 from notificacoes where pessoa_id = solo) then raise exception 'FALHOU: avisou quem não mudou'; end if;

  -- Escala publicada na Projeção com ela: o facilitador da Transmissão é avisado (1 por pessoa por hora)
  insert into eventos (igreja_id, titulo, inicio) values (ig, 'Culto avisos', date_trunc('day', now()) + interval '30 days' + interval '22 hours') returning id into ev;
  insert into escalas_ministerio (evento_id, ministerio_id, publicada) values (ev, pj, false);
  insert into escalas (evento_id, ministerio_id, funcao_id, pessoa_id, status) values (ev, pj, f, v, 'pendente');
  select count(*) into n from notificacoes where tipo = 'escalado_outro_ministerio' and pessoa_id in (fc, fp, v, solo);
  if n <> 0 then raise exception 'FALHOU: avisou antes de publicar (rascunho)'; end if;
  update escalas_ministerio set publicada = true where evento_id = ev and ministerio_id = pj;
  select count(*) into n from notificacoes where pessoa_id = fc and tipo = 'escalado_outro_ministerio' and texto like '%Voluntária Dupla Teste%Projeção%';
  if n <> 1 then raise exception 'FALHOU: facilitador do outro ministério não foi avisado da escala (%)', n; end if;
  if exists (select 1 from notificacoes where pessoa_id = fp and tipo = 'escalado_outro_ministerio') then raise exception 'FALHOU: avisou o próprio ministério'; end if;
  update escalas_ministerio set publicada = false where evento_id = ev and ministerio_id = pj;
  update escalas_ministerio set publicada = true where evento_id = ev and ministerio_id = pj;
  select count(*) into n from notificacoes where pessoa_id = fc and tipo = 'escalado_outro_ministerio';
  if n <> 1 then raise exception 'FALHOU: repetiu o aviso na mesma hora (%)', n; end if;

  -- Cada um só enxerga os próprios avisos; marcar como lido só mexe nos seus
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uv::text, true);
  select count(*) into n from notificacoes;
  if n <> 1 then raise exception 'FALHOU: voluntária enxerga % avisos (esperado 1)', n; end if;
  begin update notificacoes set lido_em = now(); raise exception 'FALHOU: gravou direto na tabela';
  exception when insufficient_privilege then null; end;
  perform marcar_notificacoes_lidas();
  select count(*) into n from notificacoes where lido_em is not null;
  if n <> 1 then raise exception 'FALHOU: não marcou como lido'; end if;
  begin perform criar_notificacao(v, 'x', 'x', 'x'); raise exception 'FALHOU: criou aviso por fora';
  exception when insufficient_privilege then null; end;

  reset role; set local role anon;
  begin perform count(*) from notificacoes; raise exception 'FALHOU: anon leu avisos';
  exception when insufficient_privilege then null; end;
  raise notice 'Avisos de novo ministério: OK';
end $$;
