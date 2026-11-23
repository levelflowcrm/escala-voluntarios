"use server";

import { revalidatePath } from "next/cache";
import { POP_MAX_TEXTO, validarLinkPop } from "@/lib/pop";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function salvarPop(ministerioId: string, conteudo: string, link: string): Promise<{ erro: string | null }> {
  if (conteudo.length > POP_MAX_TEXTO) return { erro: `Texto muito longo (máximo ${POP_MAX_TEXTO} letras)` };
  const v = validarLinkPop(link);
  if (v.erro) return { erro: v.erro };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("salvar_pop", { p_ministerio: ministerioId, p_conteudo: conteudo, p_link: v.link ?? "" });
  if (error) return { erro: error.code === "42501" ? "Só o facilitador do time pode editar o POP" : "Não foi possível salvar" };
  revalidatePath("/pop");
  return { erro: null };
}
