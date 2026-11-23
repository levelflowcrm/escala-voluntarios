/** Mês da disponibilidade: o cartão da tela inicial pede o próximo mês a partir do dia 15. */
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const DIA_DO_AVISO = 15;

/** `hoje` no formato AAAA-MM-DD (horário de Brasília). */
export function proximoMes(hoje: string): { mes: string; nome: string } {
  const ano = Number(hoje.slice(0, 4));
  const mes0 = Number(hoje.slice(5, 7)) - 1; // 0 a 11
  const prox = (mes0 + 1) % 12;
  const anoProx = mes0 === 11 ? ano + 1 : ano;
  return { mes: `${anoProx}-${String(prox + 1).padStart(2, "0")}-01`, nome: MESES[prox] };
}

export function deveAvisarDisponibilidade(hoje: string): boolean {
  return Number(hoje.slice(8, 10)) >= DIA_DO_AVISO;
}
