"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

function atualizar() {
  revalidatePath("/comunicados");
  revalidatePath("/");
}

export async function publicar(ministerioId: string, titulo: string, texto: string): Promise<{ erro: string | null }> {
  if (!titulo.trim() || !texto.trim()) return { erro: "Preencha o título e o texto" };
  if (titulo.trim().length > 120) return { erro: "Título muito longo (máximo 120 letras)" };
  if (texto.trim().length > 2000) return { erro: "Texto muito longo (máximo 2000 letras)" };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Você não está cadastrado(a)" };
  const { error } = await supabase
    .from("comunicados")
    .insert({ ministerio_id: ministerioId, autor_id: eu, titulo: titulo.trim(), texto: texto.trim() });
  if (error) return { erro: "Não foi possível publicar (só coordenadores publicam)" };
  atualizar();
  return { erro: null };
}

export async function apagar(id: string): Promise<{ erro: string | null }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("comunicados").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erro: "Não foi possível apagar" };
  atualizar();
  return { erro: null };
}
