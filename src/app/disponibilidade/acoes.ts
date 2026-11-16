"use server";

import { revalidatePath } from "next/cache";
import type { Periodo } from "@/lib/escala/sugerir";
import { criarClienteServidor } from "@/lib/supabase/server";

type Resultado = { erro: string | null };
const PERIODOS: Periodo[] = ["manha", "tarde", "noite"];
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Regra de um turno: "sempre" posso, "nunca" posso, ou não posso só em
 * algumas semanas do mês (1º a 5º).
 */
export async function salvarTurno(
  diaSemana: number,
  periodo: Periodo,
  regra: "sempre" | "nunca" | number[],
): Promise<Resultado> {
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6 || !PERIODOS.includes(periodo)) {
    return { erro: "Turno inválido" };
  }
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Cadastro não encontrado" };

  const { error: erroApagar } = await supabase
    .from("indisponibilidades")
    .delete()
    .eq("pessoa_id", eu)
    .eq("dia_semana", diaSemana)
    .eq("periodo", periodo);
  if (erroApagar) return { erro: erroApagar.message };

  const ordens = Array.isArray(regra) ? [...new Set(regra)].filter((o) => o >= 1 && o <= 5) : [];
  const linhas: { pessoa_id: string; dia_semana: number; periodo: Periodo; ordem_no_mes: number | null }[] =
    regra === "nunca"
      ? [{ pessoa_id: eu, dia_semana: diaSemana, periodo, ordem_no_mes: null }]
      : ordens.map((o) => ({ pessoa_id: eu, dia_semana: diaSemana, periodo, ordem_no_mes: o }));
  if (linhas.length) {
    const { error } = await supabase.from("indisponibilidades").insert(linhas);
    if (error) return { erro: error.message };
  }
  revalidatePath("/disponibilidade");
  return { erro: null };
}

export async function adicionarBloqueio(inicio: string, fim: string, motivo: string): Promise<Resultado> {
  if (!DATA.test(inicio) || !DATA.test(fim)) return { erro: "Informe as duas datas." };
  if (fim < inicio) return { erro: "A data final vem antes da inicial." };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Cadastro não encontrado" };
  const { error } = await supabase
    .from("bloqueios")
    .insert({ pessoa_id: eu, inicio, fim, motivo: motivo.trim().slice(0, 200) || null });
  revalidatePath("/disponibilidade");
  return { erro: error?.message ?? null };
}

export async function removerBloqueio(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("bloqueios").delete().eq("id", id);
  revalidatePath("/disponibilidade");
  return { erro: error?.message ?? null };
}
