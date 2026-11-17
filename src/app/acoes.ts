"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { despacharFila } from "@/lib/whatsapp";
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

/** "Cheguei": o voluntário avisa que já está na igreja (só no dia e só perto da igreja, conferido pelo banco). */
export async function registrarChegada(escalaId: string, lat: number, lng: number, precisao: number | null) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { erro: "Não consegui ler a sua localização." };
  const supabase = await criarClienteServidor();
  // A posição só serve para o banco conferir a distância até a igreja; não é guardada.
  const { error } = await supabase.rpc("registrar_chegada", {
    p_escala: escalaId,
    p_lat: lat,
    p_lng: lng,
    p_precisao: precisao !== null && Number.isFinite(precisao) ? precisao : null,
  });
  if (!error) after(() => despacharFila()); // avisa os coordenadores por WhatsApp
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
