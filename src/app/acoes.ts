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

/** "Cheguei": o voluntário avisa que já está na igreja (só no dia, pela função do banco). */
export async function registrarChegada(escalaId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_chegada", { p_escala: escalaId });
  revalidatePath("/");
  return error ? { erro: error.message } : { erro: null };
}

/** MaisFeliz: reação anônima ao fim da escala (1 a 5). */
export async function votarMaisFeliz(eventoId: string, nota: number) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_maisfeliz", { p_evento: eventoId, p_nota: nota });
  revalidatePath("/");
  return error ? { erro: error.message } : { erro: null };
}
