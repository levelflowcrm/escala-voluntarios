"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Salva (ou limpa) o e-mail de login de um voluntário. A RLS só deixa coordenadores alterarem. */
export async function salvarEmail(pessoaId: string, email: string): Promise<{ erro: string | null }> {
  const limpo = email.trim().toLowerCase();
  if (limpo && !EMAIL.test(limpo)) return { erro: "E-mail inválido" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("pessoas")
    .update({ email: limpo || null })
    .eq("id", pessoaId)
    .select("id");
  if (error) {
    return { erro: error.code === "23505" ? "Esse e-mail já é de outra pessoa" : "Não foi possível salvar" };
  }
  if (!data?.length) return { erro: "Sem permissão para alterar essa pessoa" };
  revalidatePath("/voluntarios");
  return { erro: null };
}
