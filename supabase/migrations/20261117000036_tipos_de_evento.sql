-- =============================================================================
-- Tipos de evento editáveis pelo master (Agenda da igreja).
--   * a lista deixa de ser fixa no código: passa a ser a tabela tipos_evento
--     (os cultos fixos, com dia da semana, continuam à parte)
--   * cor padrão do tipo (opcional); o evento ainda pode escolher outra cor
--   * os 7 tipos antigos viram linhas da tabela e os eventos existentes são ligados a eles
--   * nomes pedidos pelo master entram sem duplicar o que já existe
-- Só o master escreve (política "master" da migração 30); todos da igreja leem.
-- =============================================================================
alter table tipos_evento
  add column cor text check (cor in ('lavanda', 'rosa', 'pessego', 'amarelo', 'menta', 'azul', 'cinza'));

-- Acertos de grafia em tipos que já existiam (e nos eventos criados com o nome antigo)
do $$
declare r record;
begin
  for r in select * from (values
    ('Confra Volunter', 'Confra Volunteer'),
    ('VOE - Encontro de Empr.', 'VOE - Encontro de Empresários'),
    ('NASCI CONFERENCE', 'Nasci Conference')
  ) as v(antigo, novo)
  loop
    update eventos set titulo = r.novo
     where titulo = r.antigo
       and tipo_evento_id in (select id from tipos_evento t
                               where t.nome = r.antigo and t.dia_semana is null
                                 and not exists (select 1 from tipos_evento x where x.igreja_id = t.igreja_id and x.nome = r.novo));
    update tipos_evento t set nome = r.novo
     where t.nome = r.antigo and t.dia_semana is null
       and not exists (select 1 from tipos_evento x where x.igreja_id = t.igreja_id and x.nome = r.novo);
  end loop;
end $$;

-- Os 7 tipos antigos da agenda + os nomes pedidos (existentes são mantidos)
insert into tipos_evento (igreja_id, nome, cor)
select i.id, t.nome, t.cor
from igrejas i
cross join (values
  ('Conferência', null), ('Ensaio', null), ('Reunião', null), ('Ação social', null),
  ('Locação (evento extra)', 'pessego'), ('Outro', null),
  ('Confra Volunteer', null), ('Vigília', null), ('Culto da Virada', null),
  ('VOE - Encontro de Empresários', null), ('Encontro de Vida', null),
  ('Conferência WeGo', null), ('Nasci Conference', null), ('Noite de Unção', null),
  ('Conferência RoleUP', null), ('Batismo', null), ('Especial de Natal', null),
  ('Especial de Páscoa', null), ('Homens de Valor', null), ('Mulheres de Futuro', null),
  ('Start (Integração)', null), ('Summit', null), ('TREINAMENTO', null),
  ('Reunião Backstage', null), ('Reunião com o Pr. Nei', null)
) as t(nome, cor)
on conflict (igreja_id, nome) do nothing;

-- Locação mantém o pêssego padrão mesmo que o tipo já existisse sem cor
update tipos_evento set cor = 'pessego' where nome = 'Locação (evento extra)' and cor is null;

-- Eventos antigos: ligam ao tipo equivalente do campo tipo_agenda (que fica só como legado)
update eventos e set tipo_evento_id = t.id
from tipos_evento t
where e.tipo_evento_id is null
  and e.tipo_agenda is not null
  and t.igreja_id = e.igreja_id
  and t.nome = case e.tipo_agenda
    when 'conferencia' then 'Conferência' when 'batismo' then 'Batismo' when 'ensaio' then 'Ensaio'
    when 'reuniao' then 'Reunião' when 'acao_social' then 'Ação social'
    when 'locacao' then 'Locação (evento extra)' else 'Outro' end;
