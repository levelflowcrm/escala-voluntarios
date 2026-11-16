-- Eventos que se repetem: cada ocorrência é um evento próprio (pode ser editado
-- ou apagado sozinho); a série os agrupa para editar/apagar "esta e as próximas".
alter table eventos add column serie_id uuid;
create index eventos_serie on eventos (serie_id) where serie_id is not null;
