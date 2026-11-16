"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

type R = { erro?: string };

async function chamar(fn: string, args: Record<string, unknown>): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc(fn, args);
  revalidatePath("/permissoes");
  revalidatePath("/");
  return error ? { erro: error.message } : {};
}

export const definirAdmin = (pessoa: string, admin: boolean) => chamar("definir_admin", { p_pessoa: pessoa, p_admin: admin });
export const definirCoordenador = (pessoa: string, ministerio: string, coordenador: boolean) =>
  chamar("definir_coordenador", { p_pessoa: pessoa, p_ministerio: ministerio, p_coordenador: coordenador });
