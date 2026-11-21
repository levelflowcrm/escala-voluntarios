"use server";

import { revalidatePath } from "next/cache";
import { validarCompromisso } from "@/lib/compromissos";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function criarCompromisso(dados: {
  ministerioId: string;
  tipo: string;
  dia: string;
  hora: string;
  local: string;
  observacao: string;
}): Promise<{ erro: string | null }> {
  const v = validarCompromisso(dados);
  if ("erro" in v) return { erro: v.erro };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Você não está cadastrado(a)" };
  const { error } = await supabase.from("compromissos_time").insert({
    ministerio_id: dados.ministerioId,
    tipo: dados.tipo,
    inicio: v.inicio,
    local: v.local,
    observacao: v.observacao,
    criado_por: eu,
  });
  if (error) return { erro: "Não foi possível marcar. Só o facilitador do ministério marca compromissos." };
  revalidatePath("/compromissos");
  revalidatePath("/minhas-escalas");
  revalidatePath("/");
  return { erro: null };
}

export async function cancelarCompromisso(id: string): Promise<{ erro: string | null }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("compromissos_time").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erro: "Não foi possível cancelar" };
  revalidatePath("/compromissos");
  revalidatePath("/minhas-escalas");
  revalidatePath("/");
  return { erro: null };
}
