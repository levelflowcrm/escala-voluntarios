import type { Periodo } from "@/lib/escala/sugerir";
import type { criarClienteServidor } from "@/lib/supabase/server";
import { turnosDosCultos } from "@/lib/turnos";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

export type RegraTurno = "sempre" | "nunca" | number[];
export type Atalho = "todos" | "fim_de_semana" | "semana";

export type DadosDisponibilidade = {
  turnos: { diaSemana: number; periodo: Periodo; cultos: string[]; regra: RegraTurno }[];
  bloqueios: { id: string; inicio: string; fim: string; motivo: string | null }[];
  hoje: string;
  limite: number | null;
  observacao: string;
  atalho: Atalho | null;
  marcados: string[];
  diasComEvento: string[];
  soDiasMarcados: boolean;
};

/** Tudo da disponibilidade de uma pessoa (a própria, ou um voluntário visto pelo facilitador). */
export async function dadosDisponibilidade(supabase: Cliente, pessoaId: string): Promise<DadosDisponibilidade> {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [{ data: tipos }, { data: indisp }, { data: bloqueios }, { data: pref }, { data: marcados }, { data: eventos }] = await Promise.all([
    supabase.from("tipos_evento").select("nome, dia_semana, hora").eq("ativo", true).not("dia_semana", "is", null),
    supabase.from("indisponibilidades").select("dia_semana, periodo, ordem_no_mes").eq("pessoa_id", pessoaId),
    supabase.from("bloqueios").select("id, inicio, fim, motivo").eq("pessoa_id", pessoaId).gte("fim", hoje).order("inicio"),
    supabase.from("preferencias").select("limite_mensal, observacao, so_dias_marcados").eq("pessoa_id", pessoaId).maybeSingle(),
    supabase.from("dias_disponiveis").select("dia").eq("pessoa_id", pessoaId).gte("dia", hoje),
    supabase.from("eventos").select("inicio").gte("inicio", new Date().toISOString()).lt("inicio", new Date(Date.now() + 200 * 86400000).toISOString()),
  ]);

  const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const diasComEvento = [...new Set((eventos ?? []).map((e) => fmtDia.format(new Date(e.inicio))))];

  // Atalho ativo: só reconhece quando as regras por dia da semana são exatamente as do atalho
  const diasBloqueados = (indisp ?? []).filter((i) => i.periodo === null && i.ordem_no_mes === null).map((i) => i.dia_semana).sort();
  const soDiasInteiros = (indisp ?? []).length === diasBloqueados.length;
  const atalho: Atalho | null = !soDiasInteiros
    ? null
    : diasBloqueados.length === 0
      ? "todos"
      : diasBloqueados.join() === "1,2,3,4,5"
        ? "fim_de_semana"
        : diasBloqueados.join() === "0,6"
          ? "semana"
          : null;

  const turnos = turnosDosCultos(tipos ?? []).map((t) => {
    const minhas = (indisp ?? []).filter((i) => i.dia_semana === t.diaSemana && (i.periodo === t.periodo || i.periodo === null));
    const regra: RegraTurno = minhas.some((i) => i.ordem_no_mes === null)
      ? "nunca"
      : minhas.length
        ? minhas.map((i) => i.ordem_no_mes as number).sort()
        : "sempre";
    return { ...t, regra };
  });

  return {
    turnos: turnos as DadosDisponibilidade["turnos"],
    bloqueios: bloqueios ?? [],
    hoje,
    limite: pref?.limite_mensal ?? null,
    observacao: pref?.observacao ?? "",
    atalho,
    marcados: (marcados ?? []).map((m) => m.dia as string),
    diasComEvento,
    soDiasMarcados: pref?.so_dias_marcados ?? false,
  };
}
