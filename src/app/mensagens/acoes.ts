"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function enviarMensagem(tipo: "erro" | "sugestao", texto: string, pagina: string): Promise<{ erro: string | null }> {
  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva a mensagem" };
  if (limpo.length > 2000) return { erro: "Texto muito longo (máximo 2000 letras)" };
  if (tipo !== "erro" && tipo !== "sugestao") return { erro: "Escolha o tipo da mensagem" };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Você não está cadastrado(a)" };
  const { error } = await supabase
    .from("mensagens_app")
    .insert({ autor_id: eu, tipo, texto: limpo, pagina: pagina.trim().slice(0, 200) || null });
  if (error) return { erro: "Não foi possível enviar. Tente de novo." };
  revalidatePath("/mensagens");
  revalidatePath("/");
  return { erro: null };
}

export async function marcarMensagem(id: string, status: "vista" | "resolvida"): Promise<{ erro: string | null }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("mensagens_app").update({ status }).eq("id", id).select("id");
  if (error || !data?.length) return { erro: "Não foi possível atualizar" };
  revalidatePath("/mensagens");
  revalidatePath("/");
  return { erro: null };
}
