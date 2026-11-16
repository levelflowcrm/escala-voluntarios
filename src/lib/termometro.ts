export type Carga = { pessoaId: string; nome: string; mes: number; noventa: number; ultimo: string | null };
export type Nivel = "alta" | "equilibrada" | "baixa";

/**
 * Classifica a carga de cada pessoa em relação à média do time nos últimos 90 dias.
 * alta: bem acima da média (risco de cansaço); baixa: nenhuma escala no período; senão equilibrada.
 */
export function classificarCarga(cargas: Carga[]): Map<string, Nivel> {
  const resultado = new Map<string, Nivel>();
  if (cargas.length === 0) return resultado;
  const media = cargas.reduce((s, c) => s + c.noventa, 0) / cargas.length;
  for (const c of cargas) {
    resultado.set(
      c.pessoaId,
      c.noventa === 0 ? "baixa" : media > 0 && c.noventa >= 3 && c.noventa > media * 1.5 ? "alta" : "equilibrada",
    );
  }
  return resultado;
}

/** Aniversariantes do mês (1–12) ordenados pelo dia. A data vem como AAAA-MM-DD. */
export function aniversariantesDoMes(pessoas: { nome: string; aniversario: string | null }[], mes: number) {
  return pessoas
    .filter((p) => p.aniversario && Number(p.aniversario.slice(5, 7)) === mes)
    .map((p) => ({ nome: p.nome, dia: Number(p.aniversario!.slice(8, 10)) }))
    .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome, "pt-BR"));
}
