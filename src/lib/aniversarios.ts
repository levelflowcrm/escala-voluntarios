export type Aniversariante = { nome: string; dia: number; mes: number; faltam: number };

const MS_DIA = 86_400_000;
const bissexto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;

/**
 * Próximos aniversários a partir de `hoje` (AAAA-MM-DD), dentro de `dias` dias, passando pela virada do ano.
 * `faltam` = 0 quando é hoje. Quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos.
 */
export function proximosAniversarios(pessoas: { nome: string; aniversario: string | null }[], hoje: string, dias = 30): Aniversariante[] {
  const [ay, am, ad] = hoje.split("-").map(Number);
  const base = Date.UTC(ay, am - 1, ad);
  const saida: Aniversariante[] = [];
  for (const p of pessoas) {
    if (!p.aniversario || !/^\d{4}-\d{2}-\d{2}$/.test(p.aniversario)) continue;
    const mes = Number(p.aniversario.slice(5, 7));
    const dia = Number(p.aniversario.slice(8, 10));
    const data = (ano: number) => Date.UTC(ano, mes - 1, mes === 2 && dia === 29 && !bissexto(ano) ? 28 : dia);
    let alvo = data(ay);
    if (alvo < base) alvo = data(ay + 1);
    const faltam = Math.round((alvo - base) / MS_DIA);
    if (faltam <= dias) saida.push({ nome: p.nome, dia, mes, faltam });
  }
  return saida.sort((a, b) => a.faltam - b.faltam || a.nome.localeCompare(b.nome, "pt-BR"));
}
