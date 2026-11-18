-- Projeção tem as duas áreas (Holyrics e Resolume), uma vaga em cada por evento.
do $$
declare pj uuid; n int;
begin
  select id into pj from ministerios where nome = 'Projeção';
  select count(*) into n from funcoes where ministerio_id = pj and nome in ('Holyrics','Resolume') and ativo;
  if n <> 2 then raise exception 'FALHOU: Projeção deveria ter Holyrics e Resolume (achou %)', n; end if;
  -- rodar de novo não duplica
  insert into funcoes (ministerio_id, nome, ordem) values (pj, 'Holyrics', 1) on conflict (ministerio_id, nome) do nothing;
  select count(*) into n from funcoes where ministerio_id = pj and nome = 'Holyrics';
  if n <> 1 then raise exception 'FALHOU: Holyrics duplicada'; end if;
end $$;
