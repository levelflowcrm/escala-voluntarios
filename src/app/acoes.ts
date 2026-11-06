"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}

/** Confirmar ou "Não posso" na própria escala. Devolve a mensagem de erro, se houver. */
export async function responder(escalaId: string, resposta: "confirmado" | "recusado", motivo?: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("responder_escala", {
    escala: escalaId,
    resposta,
    motivo_txt: motivo?.slice(0, 300) ?? null,
  });
  revalidatePath("/");
  return error ? { erro: error.message } : { erro: null };
}
