-- A disponibilidade é exclusiva do voluntário: o facilitador vê (leitura já existente + coordeno_pessoa
-- para o resumo), mas não edita. Evita dois facilitadores desfazendo o ajuste um do outro.
drop policy if exists facilitador on indisponibilidades;
drop policy if exists facilitador on bloqueios;
drop policy if exists facilitador on dias_disponiveis;
drop policy if exists facilitador on preferencias;
