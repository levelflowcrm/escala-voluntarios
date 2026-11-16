import type { Periodo } from "./escala/sugerir";

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const PERIODOS: Record<Periodo, string> = { manha: "manhã", tarde: "tarde", noite: "noite" };

/** Mesmo corte do motor de sugestão: antes de 12h manhã, antes de 18h tarde, senão noite. */
export function periodoDaHora(hora: string): Periodo {
  const h = Number(hora.slice(0, 2));
  return h < 12 ? "manha" : h < 18 ? "tarde" : "noite";
}

export type Turno = { diaSemana: number; periodo: Periodo; cultos: string[] };

/** Turnos dos cultos fixos (um por dia da semana + período), em ordem de quarta a domingo. */
export function turnosDosCultos(tipos: { nome: string; dia_semana: number | null; hora: string | null }[]): Turno[] {
  const mapa = new Map<string, Turno>();
  for (const t of tipos) {
    if (t.dia_semana == null || !t.hora) continue;
    const periodo = periodoDaHora(t.hora);
    const chave = `${t.dia_semana}|${periodo}`;
    const turno = mapa.get(chave) ?? { diaSemana: t.dia_semana, periodo, cultos: [] };
    turno.cultos.push(t.nome);
    mapa.set(chave, turno);
  }
  const ordemDia = (d: number) => (d === 0 ? 7 : d); // domingo por último
  const ordemPeriodo = { manha: 0, tarde: 1, noite: 2 };
  return [...mapa.values()].sort(
    (a, b) => ordemDia(a.diaSemana) - ordemDia(b.diaSemana) || ordemPeriodo[a.periodo] - ordemPeriodo[b.periodo],
  );
}

export function nomeTurno(t: { diaSemana: number; periodo: Periodo | null }): string {
  return t.periodo ? `${DIAS_SEMANA[t.diaSemana]} à ${PERIODOS[t.periodo]}`.replace("à manhã", "de manhã") : DIAS_SEMANA[t.diaSemana];
}
