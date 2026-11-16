/** Repetição de eventos da agenda. Trabalha com datas AAAA-MM-DD (sem fuso). */
export type Repeticao = "nenhuma" | "semanal" | "quinzenal" | "mensal_dia" | "mensal_semana";

export const REPETICOES: Record<Repeticao, string> = {
  nenhuma: "Não repete",
  semanal: "Toda semana",
  quinzenal: "A cada 2 semanas",
  mensal_dia: "Todo mês, no mesmo dia (ex.: dia 15)",
  mensal_semana: "Todo mês, na mesma semana (ex.: 1º sábado)",
};

export const MAX_OCORRENCIAS = 60;

const data = (s: string) => new Date(`${s}T12:00:00Z`);
const texto = (d: Date) => d.toISOString().slice(0, 10);

function somarDias(s: string, n: number): string {
  const d = data(s);
  d.setUTCDate(d.getUTCDate() + n);
  return texto(d);
}

/** Datas da série, incluindo a inicial, até `ate` (inclusive) e no máximo MAX_OCORRENCIAS. */
export function gerarOcorrencias(inicio: string, repeticao: Repeticao, ate: string): string[] {
  if (repeticao === "nenhuma" || ate <= inicio) return [inicio];
  const lista = [inicio];
  const base = data(inicio);
  const dia = base.getUTCDate();
  const diaSemana = base.getUTCDay();
  const ordem = Math.ceil(dia / 7); // 1º, 2º, ... da semana no mês
  let mes = 0;

  while (lista.length < MAX_OCORRENCIAS) {
    let proxima: string;
    if (repeticao === "semanal" || repeticao === "quinzenal") {
      proxima = somarDias(lista[lista.length - 1], repeticao === "semanal" ? 7 : 14);
    } else {
      mes += 1;
      const a = base.getUTCFullYear();
      const m = base.getUTCMonth() + mes;
      if (repeticao === "mensal_dia") {
        const ultimo = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
        proxima = texto(new Date(Date.UTC(a, m, Math.min(dia, ultimo), 12)));
      } else {
        // n-ésimo dia da semana do mês; se não existir (ex.: 5º), usa o último
        const primeiro = new Date(Date.UTC(a, m, 1, 12));
        const desloc = (diaSemana - primeiro.getUTCDay() + 7) % 7;
        let d = 1 + desloc + (ordem - 1) * 7;
        const ultimo = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
        while (d > ultimo) d -= 7;
        proxima = texto(new Date(Date.UTC(a, m, d, 12)));
      }
    }
    if (proxima > ate) break;
    lista.push(proxima);
  }
  return lista;
}
