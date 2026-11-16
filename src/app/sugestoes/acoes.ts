"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function enviar(ministerioId: string, texto: string, anonima: boolean): Promise<{ erro: string | null }> {
  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva sua sugestão" };
  if (limpo.length > 1000) return { erro: "Texto muito longo (máximo 1000 letras)" };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Você não está cadastrado(a)" };
  const { error } = await supabase
    .from("sugestoes")
    .insert({ ministerio_id: ministerioId, texto: limpo, anonima, autor_id: anonima ? null : eu });
  if (error) return { erro: "Não foi possível enviar" };
  revalidatePath("/sugestoes");
  return { erro: null };
}

export async function marcar(id: string, status: "vista" | "aplicada"): Promise<{ erro: string | null }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("sugestoes").update({ status }).eq("id", id).select("id");
  if (error || !data?.length) return { erro: "Não foi possível atualizar" };
  revalidatePath("/sugestoes");
  return { erro: null };
}
