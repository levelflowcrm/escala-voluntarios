"use server";

import { revalidatePath } from "next/cache";
import { validarFoto } from "@/lib/foto";
import { criarClienteServidor } from "@/lib/supabase/server";

type R = { erro: string | null };

export async function salvarFoto(dataUrl: string): Promise<R> {
  const erro = validarFoto(dataUrl);
  if (erro) return { erro };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Entre de novo para continuar." };
  const { error } = await supabase.from("fotos_perfil").upsert({ pessoa_id: eu, foto: dataUrl, atualizado_em: new Date().toISOString() });
  revalidatePath("/perfil");
  revalidatePath("/");
  return { erro: error ? "Não foi possível salvar a foto agora." : null };
}

export async function removerFoto(): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Entre de novo para continuar." };
  const { error } = await supabase.from("fotos_perfil").delete().eq("pessoa_id", eu);
  revalidatePath("/perfil");
  revalidatePath("/");
  return { erro: error ? "Não foi possível remover agora." : null };
}
