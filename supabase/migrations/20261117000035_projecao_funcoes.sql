-- Projeção: duas áreas por culto/evento, uma pessoa em cada (2 voluntários).
-- Cada função recebe 1 titular por evento, então Holyrics + Resolume = 2 vagas.
insert into funcoes (ministerio_id, nome, ordem)
select m.id, f.nome, f.ordem
from ministerios m
cross join (values ('Holyrics', 1), ('Resolume', 2)) as f(nome, ordem)
where m.nome = 'Projeção'
on conflict (ministerio_id, nome) do nothing;
