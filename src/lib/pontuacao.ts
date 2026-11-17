/** Níveis e apresentação da pontuação. As regras de cálculo ficam no banco (migração 19) e em docs/REGRAS.md. */
export const NIVEIS = [
  { id: "semente", emoji: "🌰", rotulo: "Semente", minimo: 0 },
  { id: "plantinha", emoji: "🌱", rotulo: "Plantinha", minimo: 30 },
  { id: "arbusto", emoji: "🌿", rotulo: "Arbusto", minimo: 70 },
  { id: "arvore", emoji: "🌳", rotulo: "Árvore", minimo: 120 },
  { id: "frutifera", emoji: "🌳🍎", rotulo: "Árvore frutífera", minimo: 180 },
] as const;

export type Pontuacao = {
  pontos: number;
  nivel: string;
  servidas: number;
  no_horario: number;
  cobriu: number;
  assumiu: number;
  trocou: number;
  recusou: number;
  sem_resposta: number;
  sequencia: number;
};

export function dadosDoNivel(id: string) {
  return NIVEIS.find((n) => n.id === id) ?? NIVEIS[0];
}

/** Quanto falta para o próximo nível (null quando já é árvore frutífera). */
export function progressoNivel(pontos: number): { proximo: (typeof NIVEIS)[number] | null; faltam: number; percentual: number } {
  const atualIdx = NIVEIS.reduce((acc, n, i) => (pontos >= n.minimo ? i : acc), 0);
  const proximo = NIVEIS[atualIdx + 1] ?? null;
  if (!proximo) return { proximo: null, faltam: 0, percentual: 100 };
  const base = NIVEIS[atualIdx].minimo;
  return { proximo, faltam: proximo.minimo - pontos, percentual: Math.round(((pontos - base) / (proximo.minimo - base)) * 100) };
}

/** Itens da pontuação, na ordem em que aparecem na tela (pontos por unidade = regra do banco). */
export const ITENS: { chave: keyof Pontuacao; rotulo: string; ponto: number }[] = [
  { chave: "servidas", rotulo: "Escalas servidas", ponto: 10 },
  { chave: "no_horario", rotulo: "Chegou no horário", ponto: 3 },
  { chave: "cobriu", rotulo: "Cobriu um colega", ponto: 8 },
  { chave: "assumiu", rotulo: "Assumiu vaga aberta", ponto: 8 },
  { chave: "recusou", rotulo: "Escalas recusadas", ponto: -4 },
  { chave: "trocou", rotulo: "Trocas pedidas", ponto: -2 },
  { chave: "sem_resposta", rotulo: "Escalas sem resposta", ponto: -6 },
];
