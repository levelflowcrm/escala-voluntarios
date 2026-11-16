/** Datas sempre no fuso da igreja (Brasil não tem horário de verão desde 2019). */
export const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00";

const partesDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "Quarta · 19/11 · 19:30": dia da semana por extenso (sem "-feira"), nunca abreviado. */
export const fmtDataHora = {
  format(data: Date): string {
    const p = Object.fromEntries(partesDataHora.formatToParts(data).map((x) => [x.type, x.value]));
    const dia = String(p.weekday).replace(/-feira$/, "");
    return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${p.day}/${p.month} · ${p.hour}:${p.minute}`;
  },
};

export const fmtMes = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, month: "long", year: "numeric" });

/** "AAAA-MM" do mês atual no fuso da igreja. */
export function mesAtual(agora = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit" }).format(agora);
  return p.slice(0, 7);
}

export function mesValido(m: string | undefined): m is string {
  return !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

export function somarMes(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Início e fim (exclusivo) do mês, em ISO com o fuso da igreja. */
export function limitesMes(mes: string): { inicio: string; fim: string } {
  return { inicio: `${mes}-01T00:00:00${OFFSET}`, fim: `${somarMes(mes, 1)}-01T00:00:00${OFFSET}` };
}

/** Datas (AAAA-MM-DD) do mês que caem no dia da semana (0 = domingo). */
export function diasDaSemanaNoMes(mes: string, diaSemana: number): string[] {
  const [a, m] = mes.split("-").map(Number);
  const dias: string[] = [];
  for (let d = 1; d <= 31; d++) {
    const data = new Date(Date.UTC(a, m - 1, d));
    if (data.getUTCMonth() !== m - 1) break;
    if (data.getUTCDay() === diaSemana) dias.push(`${mes}-${String(d).padStart(2, "0")}`);
  }
  return dias;
}

export function inicioNoFuso(dia: string, hora: string): string {
  return `${dia}T${hora.slice(0, 5)}:00${OFFSET}`;
}

/** Dia (AAAA-MM-DD) no fuso da igreja. */
export function diaNoFuso(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Quantos dias de calendário faltam (0 = hoje, 1 = amanhã), no fuso da igreja. */
export function diasAte(inicio: string | Date, agora = new Date()): number {
  const dia = (d: Date) => Date.parse(`${diaNoFuso(d)}T00:00:00Z`);
  return Math.round((dia(new Date(inicio)) - dia(agora)) / 86_400_000);
}
