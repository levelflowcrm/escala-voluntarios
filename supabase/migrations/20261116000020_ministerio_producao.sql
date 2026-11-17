-- Novo ministério do piloto: Produção (funções e coordenador a definir com o líder).
insert into ministerios (igreja_id, nome, cor)
select id, 'Produção', '#0d9488' from igrejas where slug = 'nasci-pra-deus'
on conflict (igreja_id, nome) do nothing;
