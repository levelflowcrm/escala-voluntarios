"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { celebrar, pontosAtuais } from "@/lib/celebracao-servidor";
import { despacharFila, MAX_POR_RODADA_CRON } from "@/lib/whatsapp";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}

/** Confirmar ou "Não posso" na própria escala. Devolve a mensagem de erro, se houver. */
export async function responder(escalaId: string, resposta: "confirmado" | "recusado", motivo?: string) {
  const supabase = await criarClienteServidor();
  // Antes de responder: pontuação e situação atual, para a animação mostrar a variação real
  const [antes, { data: anterior }] = await Promise.all([
    pontosAtuais(supabase),
    supabase.from("escalas").select("status").eq("id", escalaId).maybeSingle(),
  ]);
  const { error } = await supabase.rpc("responder_escala", {
    escala: escalaId,
    resposta,
    motivo_txt: motivo?.slice(0, 300) ?? null,
  });
  // "Não posso" abre a vaga: o banco enfileira o aviso aos colegas que podem assumir e aqui já enviamos.
  if (!error && resposta === "recusado") after(() => despacharFila(MAX_POR_RODADA_CRON));
  revalidatePath("/");
  if (error) return { erro: error.message };
  // Só quem volta atrás depois de ter recusado "recupera"; confirmar pela primeira vez não muda pontos
  const motivoAnimacao = resposta === "recusado" ? "recusou" : anterior?.status === "recusado" ? "recuperou" : null;
  return { erro: null, celebracao: motivoAnimacao ? await celebrar(supabase, motivoAnimacao, antes) : undefined };
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
  if (!error) after(() => despacharFila()); // avisa os facilitadores por WhatsApp
  revalidatePath("/");
  if (error) return { erro: error.message };
  // +3 só vale se chegou até a hora de início
  const { data: e } = await supabase.from("escalas").select("chegou_em, eventos(inicio)").eq("id", escalaId).maybeSingle();
  const inicio = (e?.eventos as unknown as { inicio: string } | null)?.inicio;
  const noHorario = !!e?.chegou_em && !!inicio && new Date(e.chegou_em).getTime() <= new Date(inicio).getTime();
  return { erro: null, celebracao: noHorario ? await celebrar(supabase, "chegada") : undefined };
}

/** MaisFeliz: reação anônima ao fim da escala (1 a 5). */
export async function votarMaisFeliz(eventoId: string, nota: number) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_maisfeliz", { p_evento: eventoId, p_nota: nota });
  revalidatePath("/");
  return error ? { erro: error.message } : { erro: null };
}

/** Na primeira abertura depois de servir: entrega a animação "missão cumprida" (uma só vez por escala). */
export async function buscarCelebracaoDeCulto() {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("celebrar_cultos_servidos");
  const cultos = ((data ?? []) as { titulo: string }[]).map((c) => c.titulo);
  if (error || cultos.length === 0) return { celebracao: undefined };
  return { celebracao: await celebrar(supabase, "servida", null, cultos) };
}
