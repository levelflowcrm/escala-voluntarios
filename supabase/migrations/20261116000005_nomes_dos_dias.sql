-- Nomes dos cultos sem abreviação de dia da semana (Qrta -> Quarta, Dmg -> Domingo, Sbd -> Sábado).
-- Só troca texto de exibição; ids e datas não mudam.
update tipos_evento set nome =
  replace(replace(replace(nome, ' - Qrta', ' - Quarta'), 'Dmg ', 'Domingo '), ' - Sbd', ' - Sábado')
 where nome ~ ' - Qrta|Dmg |- Sbd';

update eventos set titulo =
  replace(replace(replace(titulo, ' - Qrta', ' - Quarta'), 'Dmg ', 'Domingo '), ' - Sbd', ' - Sábado')
 where titulo ~ ' - Qrta|Dmg |- Sbd';
