import { diaNoFuso, FUSO } from "./datas";
import { TOM_VALIDO } from "./musicas";

export type Bloco = "abertura" | "ofertorio" | "encerramento";
export type Musica = { bloco: Bloco; titulo: string; artista: string; tom: string; musicaId?: string | null };

export const LIMITES = { aberturaMin: 3, aberturaMax: 4 } as const;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "18/nov às 19:13" (horário de Brasília): quando o repertório foi atualizado pela última vez. */
export function formatarAtualizacao(iso: string | Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO, day: "2-digit", month: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(typeof iso === "string" ? new Date(iso) : iso);
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${v("day")}/${MESES[Number(v("month")) - 1]} às ${v("hour")}:${v("minute")}`;
}

/**
 * Regras da igreja: abertura de 3 a 4 músicas, ofertório opcional (0 ou 1) e 1 de encerramento.
 * Devolve a mensagem de erro ou null se está tudo certo (o banco confere de novo).
 */
export function validarRepertorio(musicas: Musica[]): string | null {
  const por = (b: Bloco) => musicas.filter((m) => m.bloco === b);
  if (musicas.some((m) => !m.titulo.trim())) return "Preencha o título de todas as músicas (ou remova a linha vazia).";
  if (musicas.some((m) => m.titulo.trim().length > 120 || m.artista.trim().length > 120)) return "Título ou artista muito longo (máximo 120 letras).";
  if (musicas.some((m) => m.tom.trim() && !TOM_VALIDO.test(m.tom.trim()))) return "Tom inválido. Use, por exemplo: G, Bb, F#m.";
  const ab = por("abertura").length;
  if (ab < LIMITES.aberturaMin || ab > LIMITES.aberturaMax) return `A abertura precisa ter de ${LIMITES.aberturaMin} a ${LIMITES.aberturaMax} músicas.`;
  if (por("ofertorio").length > 1) return "O ofertório tem no máximo 1 música (e é opcional).";
  if (por("encerramento").length !== 1) return "O encerramento precisa ter 1 música.";
  return null;
}

export type Modo = "rascunho" | "agora" | "programar";

/** O repertório programado sai às 7h30 (Brasília) do dia do culto. */
export function podeProgramar(inicio: string | Date, agora: Date = new Date()): boolean {
  const dia = diaNoFuso(typeof inicio === "string" ? new Date(inicio) : inicio);
  const hoje = diaNoFuso(agora);
  if (dia > hoje) return true;
  if (dia < hoje) return false;
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(agora);
  const h = Number(p.find((x) => x.type === "hour")?.value);
  const m = Number(p.find((x) => x.type === "minute")?.value);
  return h * 60 + m < 7 * 60 + 30;
}
