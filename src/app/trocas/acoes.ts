"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { celebrar, pontosAtuais } from "@/lib/celebracao-servidor";
import type { Celebracao } from "@/lib/celebracao";
import { despacharFila, MAX_POR_RODADA_CRON } from "@/lib/whatsapp";
import { criarClienteServidor } from "@/lib/supabase/server";

type R = { erro?: string; celebracao?: Celebracao };

async function chamar(fn: string, args: Record<string, unknown>): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc(fn, args);
  if (!error) after(() => despacharFila()); // avisa o colega / quem pediu por WhatsApp
  revalidatePath("/");
  revalidatePath("/trocas");
  return error ? { erro: error.message } : {};
}

/** Abre a vaga para o time: a pessoa deixa a escala e todos os colegas que podem assumir são avisados. */
export async function abrirVaga(escala: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const antes = await pontosAtuais(supabase);
  const { error } = await supabase.rpc("responder_escala", { escala, resposta: "recusado", motivo_txt: "Pedido de troca" });
  if (!error) after(() => despacharFila(MAX_POR_RODADA_CRON));
  revalidatePath("/");
  revalidatePath("/vagas");
  return error ? { erro: error.message } : { celebracao: await celebrar(supabase, "recusou", antes) };
}

export async function pedirTroca(escala: string, colega: string): Promise<R> {
  return chamar("pedir_troca", { p_escala: escala, p_colega: colega });
}
export async function responderTroca(troca: string, aceitar: boolean): Promise<R> {
  const r = await chamar("responder_troca", { p_troca: troca, p_aceitar: aceitar });
  // Aceitar cobrir o colega vale +8; recusar o pedido não mexe em pontos
  if (r.erro || !aceitar) return r;
  return { ...r, celebracao: await celebrar(await criarClienteServidor(), "cobriu") };
}
export async function cancelarTroca(troca: string): Promise<R> {
  return chamar("cancelar_troca", { p_troca: troca });
}
