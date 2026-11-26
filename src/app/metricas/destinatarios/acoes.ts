"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { normalizarNumero } from "@/lib/whatsapp";

const VOLTAR = "/metricas/destinatarios";

/** Cadastra quem recebe o relatório por WhatsApp. O banco só deixa administradores gravarem. */
export async function adicionarDestinatario(form: FormData) {
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ");
  const celular = String(form.get("celular") ?? "").trim();
  if (!nome || nome.length > 80) redirect(`${VOLTAR}?erro=${encodeURIComponent("Informe o nome (até 80 letras).")}`);
  const numero = normalizarNumero(celular);
  if (!numero) redirect(`${VOLTAR}?erro=${encodeURIComponent("WhatsApp inválido. Use DDD + número, ex.: (11) 95402-4089.")}`);
  const supabase = await criarClienteServidor();
  const { data: pode } = await supabase.rpc("pode_ver_metricas");
  if (!pode) redirect("/");
  const { data: eu } = await supabase.from("pessoas").select("igreja_id").eq("id", (await supabase.rpc("minha_pessoa")).data).maybeSingle();
  if (!eu) redirect("/sem-cadastro");
  const { error } = await supabase.from("metricas_destinatarios").insert({ igreja_id: eu.igreja_id, nome, celular: numero });
  if (error) redirect(`${VOLTAR}?erro=${encodeURIComponent(error.code === "23505" ? "Esse WhatsApp já está na lista." : "Não consegui salvar. Tente de novo.")}`);
  revalidatePath(VOLTAR);
  redirect(VOLTAR);
}

export async function removerDestinatario(form: FormData) {
  const id = String(form.get("id") ?? "");
  const supabase = await criarClienteServidor();
  await supabase.from("metricas_destinatarios").delete().eq("id", id);
  revalidatePath(VOLTAR);
  redirect(VOLTAR);
}
