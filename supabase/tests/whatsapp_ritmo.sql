-- Fila do WhatsApp: prioridade e validade definidas pelo tipo da mensagem.
\set ON_ERROR_STOP 1
do $$
declare p uuid; r record;
begin
  select id into p from pessoas where nome = 'Diogo';
  update pessoas set celular = '(11) 95402-6001' where id = p;
  delete from fila_whatsapp;
  perform enfileirar_whatsapp(p, 'ocorrencia', 'ritmo:1', 'x');
  perform enfileirar_whatsapp(p, 'chegada', 'ritmo:2', 'x');
  perform enfileirar_whatsapp(p, 'lembrete', 'ritmo:3', 'x');
  perform enfileirar_whatsapp(p, 'aniversario', 'ritmo:4', 'x');
  perform enfileirar_whatsapp(p, 'tipo_novo', 'ritmo:5', 'x');

  select * into r from fila_whatsapp where chave = 'ritmo:1';
  if r.prioridade <> 1 or r.valido_ate < now() + interval '23 hours' then raise exception 'FALHOU: ocorrência (prioridade %, validade %)', r.prioridade, r.valido_ate; end if;
  select * into r from fila_whatsapp where chave = 'ritmo:2';
  if r.prioridade <> 2 or r.valido_ate > now() + interval '3 hours 1 minute' then raise exception 'FALHOU: chegada'; end if;
  select * into r from fila_whatsapp where chave = 'ritmo:3';
  if r.prioridade <> 3 or r.valido_ate < now() + interval '13 hours' then raise exception 'FALHOU: lembrete'; end if;
  select * into r from fila_whatsapp where chave = 'ritmo:4';
  if r.prioridade <> 4 or r.valido_ate <> fim_do_dia_sp() then raise exception 'FALHOU: aniversário deveria valer até o fim do dia'; end if;
  if fim_do_dia_sp() <= now() or fim_do_dia_sp() > now() + interval '24 hours' then raise exception 'FALHOU: fim do dia fora do intervalo'; end if;
  select * into r from fila_whatsapp where chave = 'ritmo:5';
  if r.prioridade <> 3 or r.valido_ate > now() + interval '12 hours 1 minute' then raise exception 'FALHOU: tipo novo deveria usar o padrão'; end if;
  if (select array_agg(chave order by prioridade, criado_em) from fila_whatsapp)[1] <> 'ritmo:1' then raise exception 'FALHOU: ocorrência deveria ser a primeira'; end if;
  delete from fila_whatsapp where chave like 'ritmo:%';
  raise notice 'WhatsApp: prioridade e validade por tipo OK';
end $$;
