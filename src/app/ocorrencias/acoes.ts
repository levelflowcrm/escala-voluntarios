"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { despacharFila } from "@/lib/whatsapp";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GRAVIDADES, TIPOS, type Gravidade, type TipoOcorrencia } from "@/lib/ocorrencias";

export async function registrar(dados: {
  ministerioId: string;
  eventoId: string | null;
  tipo: TipoOcorrencia;
  gravidade: Gravidade;
  texto: string;
}): Promise<{ erro: string | null }> {
  const limpo = dados.texto.trim();
  if (!limpo) return { erro: "Conte o que aconteceu" };
  if (limpo.length > 2000) return { erro: "Texto muito longo (máximo 2000 letras)" };
  if (!TIPOS.some((t) => t.valor === dados.tipo)) return { erro: "Escolha o tipo" };
  if (!GRAVIDADES.some((g) => g.valor === dados.gravidade)) return { erro: "Escolha a gravidade" };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Você não está cadastrado(a)" };
  const { error } = await supabase.from("ocorrencias").insert({
    ministerio_id: dados.ministerioId,
    evento_id: dados.eventoId,
    autor_id: eu,
    tipo: dados.tipo,
    gravidade: dados.gravidade,
    texto: limpo,
  });
  if (error) return { erro: "Não foi possível registrar. Tente de novo." };
  after(() => despacharFila()); // avisa o facilitador por WhatsApp na hora (o banco só enfileira)
  revalidatePath("/ocorrencias");
  revalidatePath("/");
  return { erro: null };
}

export async function tratar(id: string, status: "ciente" | "resolvida", resposta: string): Promise<{ erro: string | null }> {
  const limpa = resposta.trim();
  if (limpa.length > 1000) return { erro: "Resposta muito longa (máximo 1000 letras)" };
  const supabase = await criarClienteServidor();
  const mudanca: { status: string; resposta?: string } = { status };
  if (limpa) mudanca.resposta = limpa;
  const { data, error } = await supabase.from("ocorrencias").update(mudanca).eq("id", id).select("id");
  if (error || !data?.length) return { erro: "Não foi possível atualizar" };
  revalidatePath("/ocorrencias");
  revalidatePath("/");
  return { erro: null };
}
