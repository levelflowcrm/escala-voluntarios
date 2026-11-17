"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { despacharFila } from "@/lib/whatsapp";
import { criarClienteServidor } from "@/lib/supabase/server";

export type DadosPerfil = { nomeCompleto: string; celular: string; aniversario: string };

/** O voluntário edita só os próprios dados de contato (a RLS já restringe à própria linha). */
export async function salvarPerfil(d: DadosPerfil): Promise<{ erro: string | null }> {
  const celular = d.celular.replace(/\D/g, "");
  if (celular && (celular.length < 10 || celular.length > 11)) return { erro: "Celular inválido (use DDD + número)" };
  if (d.aniversario && !/^\d{4}-\d{2}-\d{2}$/.test(d.aniversario)) return { erro: "Data de aniversário inválida" };

  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Você não está cadastrado(a)" };
  const { error } = await supabase
    .from("pessoas")
    .update({
      nome_completo: d.nomeCompleto.trim() || null,
      celular: celular || null,
      aniversario: d.aniversario || null,
    })
    .eq("id", eu);
  if (error) return { erro: "Não foi possível salvar" };
  revalidatePath("/perfil");
  after(() => despacharFila());
  return { erro: null };
}
