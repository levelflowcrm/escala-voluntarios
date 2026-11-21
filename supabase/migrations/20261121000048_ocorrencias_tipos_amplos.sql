-- =============================================================================
-- Ocorrências: tipos mais amplos, que servem para qualquer ministério
-- (Transmissão, Louvor, Projeção, Iluminação, Recepção, Kids, Intercessão...).
-- O aviso continua indo só para o(s) facilitador(es) do ministério escolhido.
--   equipamento  → Equipamento ou material
--   tecnico      → Som, imagem ou transmissão (antigo "transmissao")
--   equipe       → Equipe ou escala (falta, atraso, sobrecarga)
--   pessoas      → Atendimento a pessoas (visitante, membro, criança)
--   seguranca    → Segurança ou saúde (acidente, mal-estar, risco)
--   estrutura    → Espaço e estrutura (limpeza, ar-condicionado, cadeiras)
--   programacao  → Programação ou horário (atraso, mudança na ordem do culto)
--   outro        → Outro
-- =============================================================================
alter table ocorrencias drop constraint ocorrencias_tipo_check;
update ocorrencias set tipo = 'tecnico' where tipo = 'transmissao';
alter table ocorrencias add constraint ocorrencias_tipo_check check (
  tipo in ('equipamento', 'tecnico', 'equipe', 'pessoas', 'seguranca', 'estrutura', 'programacao', 'outro'));
