export const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export type Pausa = { tipo_evento_id: string | null; de: string; ate: string };

/** Soma dias a uma data AAAA-MM-DD (calendário, sem fuso). */
export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Dia da semana (0 = domingo) de uma data AAAA-MM-DD. */
export function diaDaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00Z`).getUTCDay();
}

/** Move a data para o novo dia da semana dentro da mesma semana (domingo a sábado). */
export function moverParaDiaDaSemana(dia: string, novoDia: number): string {
  return somarDias(dia, novoDia - diaDaSemana(dia));
}

/** O dia cai numa pausa que vale para este culto (pausa do tipo ou pausa geral)? */
export function emPausa(dia: string, tipoId: string, pausas: Pausa[]): boolean {
  return pausas.some((p) => (p.tipo_evento_id === null || p.tipo_evento_id === tipoId) && dia >= p.de && dia <= p.ate);
}

/** Valida o formulário de culto fixo. */
export function validarCultoFixo(d: { nome: string; diaSemana: number; hora: string }): { erro: string | null } {
  if (d.nome.trim().length < 2) return { erro: "Dê um nome ao culto" };
  if (d.nome.trim().length > 80) return { erro: "Nome muito longo (máximo 80 letras)" };
  if (!Number.isInteger(d.diaSemana) || d.diaSemana < 0 || d.diaSemana > 6) return { erro: "Escolha o dia da semana" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.hora)) return { erro: "Horário inválido" };
  return { erro: null };
}
