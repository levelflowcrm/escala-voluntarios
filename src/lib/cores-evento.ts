/** Paleta pastel dos eventos da agenda. As classes são escritas por extenso para o Tailwind enxergá-las. */
export const CORES: Record<string, { nome: string; card: string; bolinha: string }> = {
  lavanda: { nome: "Lavanda", card: "border-violet-300 bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50", bolinha: "border-violet-400 bg-violet-200" },
  rosa: { nome: "Rosa", card: "border-pink-300 bg-pink-100 dark:border-pink-800 dark:bg-pink-950/50", bolinha: "border-pink-400 bg-pink-200" },
  pessego: { nome: "Pêssego", card: "border-orange-300 bg-orange-100 dark:border-orange-800 dark:bg-orange-950/50", bolinha: "border-orange-400 bg-orange-200" },
  amarelo: { nome: "Amarelo", card: "border-yellow-300 bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950/50", bolinha: "border-yellow-400 bg-yellow-200" },
  menta: { nome: "Menta", card: "border-emerald-300 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50", bolinha: "border-emerald-400 bg-emerald-200" },
  azul: { nome: "Azul", card: "border-sky-300 bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50", bolinha: "border-sky-400 bg-sky-200" },
  cinza: { nome: "Cinza", card: "border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800/60", bolinha: "border-slate-400 bg-slate-300" },
};

/** Cor efetiva do evento: a escolhida no evento, senão a cor padrão do tipo (definida pelo master), senão nenhuma. */
export function corDoEvento(corDoTipo: string | null, cor: string | null): string | null {
  if (cor && CORES[cor]) return cor;
  return corDoTipo && CORES[corDoTipo] ? corDoTipo : null;
}
