/** Termômetro de emojis do MaisFeliz (1 = mais difícil, 5 = maravilhoso). */
export const TERMOMETRO = [
  { nota: 1, emoji: "😞", rotulo: "Foi difícil" },
  { nota: 2, emoji: "😕", rotulo: "Puxado" },
  { nota: 3, emoji: "😐", rotulo: "Normal" },
  { nota: 4, emoji: "🙂", rotulo: "Bom" },
  { nota: 5, emoji: "😍", rotulo: "Maravilhoso" },
] as const;

/** Mínimo de votos para mostrar o resumo (protege o anonimato). */
export const MIN_VOTOS = 3;

export type ResumoMaisFeliz = {
  total: number;
  contagens: [number, number, number, number, number] | null;
  media: number | null;
};

/** Emoji que representa uma média (arredonda para a nota mais próxima). */
export function emojiDaMedia(media: number): string {
  const nota = Math.min(5, Math.max(1, Math.round(media)));
  return TERMOMETRO[nota - 1].emoji;
}
