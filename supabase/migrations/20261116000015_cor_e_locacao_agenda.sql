-- =============================================================================
-- Agenda: eventos "especiais" (igreja locada para outras) e cor do evento.
--   * novo tipo de evento: 'locacao' (locação / evento extra)
--   * cor opcional (paleta pastel); sem cor = padrão do tipo
-- =============================================================================
alter table eventos drop constraint eventos_tipo_agenda_check;
alter table eventos add constraint eventos_tipo_agenda_check
  check (tipo_agenda in ('conferencia', 'batismo', 'ensaio', 'reuniao', 'acao_social', 'locacao', 'outro'));

alter table eventos add column cor text
  check (cor in ('lavanda', 'rosa', 'pessego', 'amarelo', 'menta', 'azul', 'cinza'));
