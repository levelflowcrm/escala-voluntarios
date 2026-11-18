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

  // Um atalho ("só fins de semana") grava o dia inteiro (período nulo). Antes de mexer em um turno,
  // vira uma linha por período para que os outros turnos do dia continuem como estavam.
  const { data: diaInteiro } = await supabase
    .from("indisponibilidades")
    .select("id")
    .eq("pessoa_id", eu)
    .eq("dia_semana", diaSemana)
    .is("periodo", null)
    .is("ordem_no_mes", null);
  if (diaInteiro?.length) {
    const { error: erroExpandir } = await supabase.from("indisponibilidades").delete().in("id", diaInteiro.map((i) => i.id));
    if (erroExpandir) return { erro: erroExpandir.message };
    const { error: erroInserir } = await supabase
      .from("indisponibilidades")
      .insert(PERIODOS.map((p) => ({ pessoa_id: eu, dia_semana: diaSemana, periodo: p, ordem_no_mes: null })));
    if (erroInserir) return { erro: erroInserir.message };
  }

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

export async function salvarPreferencias(limite: number | null, observacao: string): Promise<{ erro: string | null }> {
  if (limite !== null && (!Number.isInteger(limite) || limite < 1 || limite > 10)) return { erro: "Limite inválido" };
  const nota = observacao.trim().slice(0, 200);
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Cadastro não encontrado" };
  const { error } = await supabase
    .from("preferencias")
    .upsert({ pessoa_id: eu, limite_mensal: limite, observacao: nota || null, atualizado_em: new Date().toISOString() });
  revalidatePath("/disponibilidade");
  return { erro: error ? "Não foi possível salvar agora. Tente de novo." : null };
}

export type Atalho = "todos" | "fim_de_semana" | "semana";

/** Atalhos da semana: fim de semana = sábado e domingo; semana = segunda a sexta. Substituem as regras por dia da semana. */
export async function aplicarAtalho(atalho: Atalho): Promise<Resultado> {
  const bloquear = atalho === "fim_de_semana" ? [1, 2, 3, 4, 5] : atalho === "semana" ? [0, 6] : atalho === "todos" ? [] : null;
  if (!bloquear) return { erro: "Atalho inválido" };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Cadastro não encontrado" };
  const { error: erroApagar } = await supabase.from("indisponibilidades").delete().eq("pessoa_id", eu);
  if (erroApagar) return { erro: erroApagar.message };
  if (bloquear.length) {
    const { error } = await supabase
      .from("indisponibilidades")
      .insert(bloquear.map((d) => ({ pessoa_id: eu, dia_semana: d, periodo: null, ordem_no_mes: null })));
    if (error) return { erro: error.message };
  }
  revalidatePath("/disponibilidade");
  return { erro: null };
}

/** Marca (ou desmarca) um dia do calendário como "posso servir". */
export async function alternarDia(dia: string, marcar: boolean): Promise<Resultado> {
  if (!DATA.test(dia)) return { erro: "Data inválida" };
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Cadastro não encontrado" };
  const { error } = marcar
    ? await supabase.from("dias_disponiveis").upsert({ pessoa_id: eu, dia })
    : await supabase.from("dias_disponiveis").delete().eq("pessoa_id", eu).eq("dia", dia);
  return { erro: error ? "Não foi possível salvar agora. Tente de novo." : null };
}

/** "Só sirvo nos dias que eu marcar no calendário." */
export async function salvarSoDiasMarcados(ligado: boolean): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return { erro: "Cadastro não encontrado" };
  const { error } = await supabase
    .from("preferencias")
    .upsert({ pessoa_id: eu, so_dias_marcados: ligado, atualizado_em: new Date().toISOString() });
  revalidatePath("/disponibilidade");
  return { erro: error ? "Não foi possível salvar agora. Tente de novo." : null };
}
