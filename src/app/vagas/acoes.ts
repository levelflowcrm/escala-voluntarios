"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function assumir(eventoId: string, funcaoId: string): Promise<{ erro?: string }> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("assumir_vaga", { p_evento: eventoId, p_funcao: funcaoId });
  if (error) return { erro: error.message };
  revalidatePath("/");
  revalidatePath("/vagas");
  return {};
}
