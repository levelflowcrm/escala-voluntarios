-- Ministérios que permitem o mesmo voluntário em mais de uma função no mesmo evento
-- (Projeção: Holyrics + Resolume). Nos demais, continua valendo "uma coisa por evento".
-- A regra entre ministérios não muda: ninguém é escalado em dois ministérios no mesmo evento.

alter table ministerios add column if not exists permite_multiplas_funcoes boolean not null default false;

update ministerios set permite_multiplas_funcoes = true
 where id = 'f91c1c12-0fc6-5845-957d-b4ff0f5f5f7b'; -- Projeção

-- O índice antigo barrava qualquer repetição da pessoa no evento. Passa a barrar só a mesma função duas vezes.
drop index if exists escalas_uma_coisa_por_evento;

create unique index escalas_uma_funcao_por_pessoa
  on escalas (evento_id, pessoa_id, coalesce(funcao_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status in ('pendente', 'confirmado');

create or replace function validar_escala() returns trigger
language plpgsql as $$
begin
  if new.funcao_id is not null and not exists (
    select 1 from funcoes f where f.id = new.funcao_id and f.ministerio_id = new.ministerio_id
  ) then
    raise exception 'A função não pertence a este ministério';
  end if;

  if new.status in ('pendente', 'confirmado') then
    if new.papel = 'responsavel_dia' and exists (
      select 1 from escalas e
      where e.evento_id = new.evento_id and e.ministerio_id = new.ministerio_id
        and e.papel = 'titular' and e.status in ('pendente', 'confirmado') and e.id <> new.id
    ) then
      raise exception 'Este ministério já tem titulares neste evento; remova-os antes de definir um responsável do dia';
    end if;

    if new.papel = 'titular' and exists (
      select 1 from escalas e
      where e.evento_id = new.evento_id and e.ministerio_id = new.ministerio_id
        and e.papel = 'responsavel_dia' and e.status in ('pendente', 'confirmado') and e.id <> new.id
    ) then
      raise exception 'Este ministério tem um responsável do dia neste evento';
    end if;

    -- Uma pessoa faz uma coisa por evento: outro ministério sempre barra; no mesmo ministério só
    -- passa se ele permitir várias funções.
    if exists (
      select 1 from escalas e
      where e.evento_id = new.evento_id and e.pessoa_id = new.pessoa_id
        and e.status in ('pendente', 'confirmado') and e.id <> new.id
        and (e.ministerio_id <> new.ministerio_id
             or not coalesce((select m.permite_multiplas_funcoes from ministerios m where m.id = new.ministerio_id), false))
    ) then
      raise exception 'Essa pessoa já está escalada neste evento' using errcode = '23505';
    end if;
  end if;
  return new;
end $$;
