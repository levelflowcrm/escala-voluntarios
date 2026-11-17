const HORA_MS = 3_600_000;

/** O botão "Cheguei" abre 3 h antes do evento e fecha 4 h depois do início (mesma regra do banco). */
export const ABRE_ANTES_H = 3;
export const FECHA_DEPOIS_H = 4;

export type SituacaoChegada = "cedo" | "aberta" | "encerrada";

export function situacaoChegada(inicioISO: string, agora: Date = new Date()): SituacaoChegada {
  const t = new Date(inicioISO).getTime();
  const n = agora.getTime();
  if (n < t - ABRE_ANTES_H * HORA_MS) return "cedo";
  if (n > t + FECHA_DEPOIS_H * HORA_MS) return "encerrada";
  return "aberta";
}

/** Chegou até o horário marcado? (usado na pontuação de pontualidade) */
export function chegouNoHorario(inicioISO: string, chegouISO: string): boolean {
  return new Date(chegouISO).getTime() <= new Date(inicioISO).getTime();
}
