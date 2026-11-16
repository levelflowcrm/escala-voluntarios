-- =============================================================================
-- Correção de segurança: o voluntário só altera os próprios dados de contato.
--
-- A política "propria" em pessoas deixava a pessoa editar QUALQUER coluna da
-- própria linha (igreja, vínculo de login, e-mail, ativo...) falando direto
-- com a API. Este gatilho bloqueia essas colunas para quem não é coordenador.
-- Edições feitas pelo próprio servidor (vincular_conta, importação) seguem
-- liberadas, pois não têm um usuário logado.
-- =============================================================================
create function proteger_pessoas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or sou_coordenador_algum() then
    return new;
  end if;
  -- vincular_conta() roda como usuário logado e só preenche o próprio auth_user_id
  if new.auth_user_id is distinct from old.auth_user_id
     and not (old.auth_user_id is null and new.auth_user_id = auth.uid()) then
    raise exception 'Sem permissão para alterar o vínculo de login';
  end if;
  if new.igreja_id is distinct from old.igreja_id
     or new.nome is distinct from old.nome
     or new.email is distinct from old.email
     or new.ativo is distinct from old.ativo
     or new.id is distinct from old.id then
    raise exception 'Sem permissão: só o coordenador altera nome, e-mail ou situação';
  end if;
  return new;
end $$;

create trigger pessoas_proteger
  before update on pessoas
  for each row execute function proteger_pessoas();
