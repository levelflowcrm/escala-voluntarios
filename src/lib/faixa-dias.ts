export type DiaFaixa = { dia: string; numero: number; semana: string; eventos: number; escalado: boolean; hoje: boolean };

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Soma `n` dias a um dia AAAA-MM-DD (sem depender de fuso). */
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Faixa de dias a partir de hoje: quantos eventos há em cada dia e se a pessoa está escalada nele.
 * `eventosPorDia` e `escaladoEm` usam dias AAAA-MM-DD no fuso da igreja.
 */
export function montarFaixa(hoje: string, eventosPorDia: Map<string, number>, escaladoEm: Set<string>, dias = 30): DiaFaixa[] {
  return Array.from({ length: dias }, (_, i) => {
    const dia = somarDias(hoje, i);
    const [a, m, d] = dia.split("-").map(Number);
    return {
      dia,
      numero: d,
      semana: SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()],
      eventos: eventosPorDia.get(dia) ?? 0,
      escalado: escaladoEm.has(dia),
      hoje: i === 0,
    };
  });
}

/** Dia que abre selecionado: hoje se tiver evento; senão o primeiro dia da faixa com evento; senão hoje. */
export function diaInicial(faixa: DiaFaixa[]): string {
  return (faixa.find((d) => d.hoje && d.eventos > 0) ?? faixa.find((d) => d.eventos > 0) ?? faixa[0]).dia;
}
