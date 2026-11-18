export type DiaFaixa = { dia: string; numero: number; semana: string; eventos: number; escalado: boolean; hoje: boolean };

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Soma `n` dias a um dia AAAA-MM-DD (sem depender de fuso). */
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Faixa só com os dias que têm evento, de hoje em diante, em ordem. Dias sem evento não aparecem.
 * `eventosPorDia` e `escaladoEm` usam dias AAAA-MM-DD no fuso da igreja.
 */
export function montarFaixa(hoje: string, eventosPorDia: Map<string, number>, escaladoEm: Set<string>): DiaFaixa[] {
  return [...eventosPorDia.entries()]
    .filter(([dia, n]) => n > 0 && dia >= hoje)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, eventos]) => {
      const [a, m, d] = dia.split("-").map(Number);
      return {
        dia,
        numero: d,
        semana: SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()],
        eventos,
        escalado: escaladoEm.has(dia),
        hoje: dia === hoje,
      };
    });
}

/** Dia que abre selecionado: hoje se tiver evento; senão o primeiro dia da faixa; sem faixa, hoje. */
export function diaInicial(faixa: DiaFaixa[], hoje: string): string {
  return (faixa.find((d) => d.hoje) ?? faixa[0])?.dia ?? hoje;
}
