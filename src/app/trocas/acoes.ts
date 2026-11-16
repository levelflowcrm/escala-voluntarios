"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

type R = { erro?: string };

async function chamar(fn: string, args: Record<string, unknown>): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc(fn, args);
  revalidatePath("/");
  revalidatePath("/trocas");
  return error ? { erro: error.message } : {};
}

export const pedirTroca = (escala: string, colega: string) => chamar("pedir_troca", { p_escala: escala, p_colega: colega });
export const responderTroca = (troca: string, aceitar: boolean) => chamar("responder_troca", { p_troca: troca, p_aceitar: aceitar });
export const cancelarTroca = (troca: string) => chamar("cancelar_troca", { p_troca: troca });
