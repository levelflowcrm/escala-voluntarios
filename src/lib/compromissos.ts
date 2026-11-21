/** Compromissos do time: tipos da lista, cor e validação do formulário. */
import { inicioNoFuso } from "./datas";

export type TipoCompromisso = "reuniao_online" | "reuniao_presencial" | "ensaio" | "confraternizacao" | "treinamento";

export const TIPOS_COMPROMISSO: { valor: TipoCompromisso; texto: string; icone: string }[] = [
  { valor: "reuniao_online", texto: "Reunião on-line", icone: "💻" },
  { valor: "reuniao_presencial", texto: "Reunião presencial", icone: "🤝" },
  { valor: "ensaio", texto: "Ensaio", icone: "🎬" },
  { valor: "confraternizacao", texto: "Confraternização", icone: "🎉" },
  { valor: "treinamento", texto: "Treinamento", icone: "📚" },
];

/**
 * Compromisso do time sempre em amarelo pastel, também no modo escuro (texto escuro por cima).
 * Classes por extenso para o Tailwind enxergá-las.
 */
export const CARTAO_COMPROMISSO = "border-yellow-300 bg-yellow-100 text-yellow-950";
export const HORA_COMPROMISSO = "bg-yellow-200 text-yellow-950";

export function rotuloCompromisso(tipo: string): { texto: string; icone: string } {
  return TIPOS_COMPROMISSO.find((t) => t.valor === tipo) ?? { texto: "Compromisso do time", icone: "📌" };
}

/**
 * Valida o formulário e devolve o início em ISO (fuso de São Paulo).
 * Aceita data AAAA-MM-DD e hora HH:MM; não aceita compromisso no passado nem a mais de 1 ano.
 */
export function validarCompromisso(
  dados: { tipo: string; dia: string; hora: string; local?: string; observacao?: string },
  agora = new Date(),
): { erro: string } | { inicio: string; local: string | null; observacao: string | null } {
  if (!TIPOS_COMPROMISSO.some((t) => t.valor === dados.tipo)) return { erro: "Escolha o tipo do compromisso" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dia)) return { erro: "Escolha a data" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dados.hora)) return { erro: "Escolha o horário" };
  const inicio = inicioNoFuso(dados.dia, dados.hora);
  const t = new Date(inicio).getTime();
  if (Number.isNaN(t)) return { erro: "Data inválida" };
  if (t < agora.getTime()) return { erro: "Esse horário já passou" };
  if (t > agora.getTime() + 366 * 86_400_000) return { erro: "Marque com no máximo 1 ano de antecedência" };
  const local = (dados.local ?? "").trim();
  const observacao = (dados.observacao ?? "").trim();
  if (local.length > 300) return { erro: "Local ou link muito longo" };
  if (observacao.length > 1000) return { erro: "Observação muito longa (máximo 1000 letras)" };
  return { inicio, local: local || null, observacao: observacao || null };
}

/** Link clicável quando o "local" for um endereço web (reunião on-line). */
export function ehLink(local: string | null): boolean {
  return !!local && /^https?:\/\/\S+$/i.test(local.trim());
}
