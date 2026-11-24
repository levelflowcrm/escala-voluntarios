import { dadosDoNivel, NIVEIS, progressoNivel } from "./pontuacao";

/** Momento do app que mexe na pontuação do voluntário (e só dele). */
export type MotivoPontos = "chegada" | "assumiu" | "cobriu" | "recusou" | "recuperou" | "servida";

export type Celebracao = {
  tom: "ganho" | "perda";
  emoji: string;
  titulo: string;
  texto: string;
  /** Pontos com sinal (+3, −4). null quando não houve mudança real (ex.: pontuação já estava em zero). */
  pontos: number | null;
  /** Linha de incentivo sobre o próximo nível. */
  nivel: string;
};

/** Pontos que cada ação vale pela regra do banco (migração 19). */
export const PONTOS_DA_ACAO = { chegada: 3, assumiu: 8, cobriu: 8 } as const;

const sinal = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

/** Frase sobre o próximo nível, a partir da pontuação que a pessoa terá/tem. */
export function frasesDeNivel(pontos: number): string {
  const { proximo, faltam } = progressoNivel(pontos);
  if (!proximo) return `Você está no nível mais alto (${NIVEIS[NIVEIS.length - 1].rotulo}). Continue assim!`;
  const atual = dadosDoNivel(NIVEIS.filter((n) => pontos >= n.minimo).pop()?.id ?? "semente");
  return `Faltam ${faltam} ${faltam === 1 ? "ponto" : "pontos"} para ${proximo.rotulo} ${proximo.emoji}. Você está em ${atual.rotulo} ${atual.emoji}.`;
}

/**
 * Monta a mensagem da animação. Ganhos usam o valor da regra (os pontos entram na soma quando o culto
 * acontece); perdas e recuperações usam a variação medida, e `variacao` 0 (pontuação já no zero) vira
 * uma mensagem sem número.
 */
export function montarCelebracao(
  motivo: MotivoPontos,
  nome: string,
  pontosAtuais: number,
  variacao?: number,
  cultos: string[] = [],
): Celebracao {
  const n = nome.trim().split(/\s+/)[0] || "voluntário";
  switch (motivo) {
    case "chegada":
      return {
        tom: "ganho",
        emoji: "⏰",
        titulo: `Pontualidade nota 10, ${n}!`,
        texto: `Você garantiu ${sinal(PONTOS_DA_ACAO.chegada)} pontos por chegar no horário. Eles entram na sua pontuação quando o culto acontece.`,
        pontos: PONTOS_DA_ACAO.chegada,
        nivel: frasesDeNivel(pontosAtuais + PONTOS_DA_ACAO.chegada),
      };
    case "assumiu":
      return {
        tom: "ganho",
        emoji: "🙌",
        titulo: `${n}, você salvou o dia!`,
        texto: `Você garantiu ${sinal(PONTOS_DA_ACAO.assumiu)} pontos por assumir uma vaga em aberto. O time conta com gente como você. Os pontos entram quando o culto acontece.`,
        pontos: PONTOS_DA_ACAO.assumiu,
        nivel: frasesDeNivel(pontosAtuais + PONTOS_DA_ACAO.assumiu),
      };
    case "cobriu":
      return {
        tom: "ganho",
        emoji: "🤝",
        titulo: `Que gesto bonito, ${n}!`,
        texto: `Você garantiu ${sinal(PONTOS_DA_ACAO.cobriu)} pontos por cobrir um colega. Isso é servir em equipe. Os pontos entram quando o culto acontece.`,
        pontos: PONTOS_DA_ACAO.cobriu,
        nivel: frasesDeNivel(pontosAtuais + PONTOS_DA_ACAO.cobriu),
      };
    case "servida": {
      // Pontos da escala servida: +10 por culto (o +3 de pontualidade já foi celebrado no "Cheguei")
      const total = Math.max(1, cultos.length) * 10;
      const varios = cultos.length > 1;
      return {
        tom: "ganho",
        emoji: "🎉",
        titulo: varios ? `${cultos.length} cultos servidos, ${n}!` : `Missão cumprida, ${n}!`,
        texto: varios
          ? `Você serviu em ${cultos.length} cultos desde a última visita e ganhou ${sinal(total)} pontos. Gratidão por cuidar do time!`
          : `Você serviu${cultos[0] ? ` no ${cultos[0]}` : ""} e ganhou ${sinal(total)} pontos. Gratidão por cuidar do time!`,
        pontos: total,
        nivel: frasesDeNivel(pontosAtuais),
      };
    }
    case "recuperou": {
      const ganho = variacao && variacao > 0 ? variacao : null;
      return {
        tom: "ganho",
        emoji: "💜",
        titulo: `Que bom ter você de volta, ${n}!`,
        texto: ganho ? `Você recuperou ${sinal(ganho)} pontos ao confirmar de novo.` : "Sua escala está confirmada de novo.",
        pontos: ganho,
        nivel: frasesDeNivel(pontosAtuais),
      };
    }
    case "recusou": {
      const perda = variacao && variacao < 0 ? variacao : null;
      return {
        tom: "perda",
        emoji: "🌱",
        titulo: `Obrigado por avisar, ${n}`,
        texto: perda
          ? `${sinal(perda)} pontos por não poder desta vez. Avisar cedo ajuda muito o time. Não se preocupe, vamos recuperar nos próximos cultos.`
          : "Avisar cedo ajuda muito o time. Na próxima, a gente conta com você.",
        pontos: perda,
        nivel: frasesDeNivel(pontosAtuais),
      };
    }
  }
}
