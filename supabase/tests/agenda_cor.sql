-- Agenda: tipo 'locacao' e cor pastel válidas; valores fora da lista são recusados.
\set ON_ERROR_STOP 1
do $$
declare ig uuid; n int;
begin
  select id into ig from igrejas limit 1;
  insert into eventos (igreja_id, titulo, inicio, so_agenda, tipo_agenda, cor)
  values (ig, 'Locação teste', now() + interval '10 days', true, 'locacao', 'pessego');
  insert into eventos (igreja_id, titulo, inicio, so_agenda, tipo_agenda)
  values (ig, 'Sem cor', now() + interval '11 days', true, 'ensaio');
  select count(*) into n from eventos where titulo = 'Sem cor' and cor is null;
  if n <> 1 then raise exception 'FALHOU: cor deveria ser opcional'; end if;
  begin
    insert into eventos (igreja_id, titulo, inicio, so_agenda, tipo_agenda, cor)
    values (ig, 'Cor errada', now() + interval '12 days', true, 'ensaio', 'vermelho');
    raise exception 'FALHOU: aceitou cor fora da paleta';
  exception when check_violation then null; end;
  begin
    insert into eventos (igreja_id, titulo, inicio, so_agenda, tipo_agenda)
    values (ig, 'Tipo errado', now() + interval '13 days', true, 'festa');
    raise exception 'FALHOU: aceitou tipo desconhecido';
  exception when check_violation then null; end;
  raise notice 'Agenda cor/locação: OK';
end $$;
