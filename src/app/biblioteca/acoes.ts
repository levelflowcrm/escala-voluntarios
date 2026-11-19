"use server";

import { revalidatePath } from "next/cache";
import { type DadosMusica, validarMusica } from "@/lib/musicas";
import { criarClienteServidor } from "@/lib/supabase/server";

type R = { erro: string | null };

const vazioParaNulo = (s: string) => (s.trim() === "" ? null : s.trim());
function linha(d: DadosMusica) {
  return {
    titulo: d.titulo.trim(),
    artista: vazioParaNulo(d.artista),
    tom: vazioParaNulo(d.tom),
    link_letra: vazioParaNulo(d.link_letra),
    link_cifra: vazioParaNulo(d.link_cifra),
    link_video: vazioParaNulo(d.link_video),
    link_audio: vazioParaNulo(d.link_audio),
    observacao: vazioParaNulo(d.observacao),
  };
}
const msg = (e: { code?: string; message: string }) =>
  e.code === "23505" ? "Essa música já está na biblioteca." : e.code === "42501" ? "Só o facilitador do Louvor pode mexer na biblioteca." : "Não foi possível salvar agora.";

export async function criarMusica(d: DadosMusica): Promise<R> {
  const erro = validarMusica(d);
  if (erro) return { erro };
  const supabase = await criarClienteServidor();
  const { data: igreja } = await supabase.rpc("minha_igreja");
  if (!igreja) return { erro: "Entre de novo para continuar." };
  const { error } = await supabase.from("musicas").insert({ igreja_id: igreja, ...linha(d) });
  revalidatePath("/biblioteca");
  return { erro: error ? msg(error) : null };
}

export async function editarMusica(id: string, d: DadosMusica): Promise<R> {
  const erro = validarMusica(d);
  if (erro) return { erro };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("musicas").update({ ...linha(d), atualizado_em: new Date().toISOString() }).eq("id", id).select("id");
  revalidatePath("/biblioteca");
  if (error) return { erro: msg(error) };
  return { erro: data && data.length > 0 ? null : "Só o facilitador do Louvor pode mexer na biblioteca." };
}

export async function excluirMusica(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("musicas").delete().eq("id", id).select("id");
  revalidatePath("/biblioteca");
  if (error) return { erro: msg(error) };
  return { erro: data && data.length > 0 ? null : "Só o facilitador do Louvor pode mexer na biblioteca." };
}
