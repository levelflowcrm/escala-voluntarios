-- A biblioteca de músicas (tom, links de letra/cifra/vídeo/áudio) é só do Louvor e do administrador.
-- A Projeção continua vendo o repertório do culto (título e artista), nada além disso.
create function pode_ver_biblioteca() returns boolean
language sql stable security definer set search_path = public as $$
  select sou_admin() or exists (
    select 1 from membros_ministerio mm join ministerios m on m.id = mm.ministerio_id
    where mm.pessoa_id = minha_pessoa() and m.igreja_id = minha_igreja() and m.nome = 'Louvor'
  )
$$;
revoke execute on function pode_ver_biblioteca() from public, anon;
grant execute on function pode_ver_biblioteca() to authenticated;

drop policy musicas_leitura on musicas;
create policy musicas_leitura on musicas for select to authenticated
  using (igreja_id = minha_igreja() and pode_ver_biblioteca());
