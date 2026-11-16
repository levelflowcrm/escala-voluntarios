export type EscalaPend = {
  id: string;
  eventoId: string;
  funcaoId: string | null;
  papel: string;
  status: string;
  motivo: string | null;
  pessoa: string;
  funcao: string;
  evento: string;
  inicio: string;
};

export type Pendencias = {
  vagasAbertas: { eventoId: string; funcao: string; evento: string; inicio: string; recusou: string; motivo: string | null }[];
  semResposta: { id: string; pessoa: string; funcao: string; evento: string; inicio: string }[];
};

const DIA_MS = 86_400_000;

/**
 * O que o coordenador precisa resolver:
 *  - vagas abertas: alguém recusou e ninguém ocupa a função (só em escalas publicadas);
 *  - sem resposta: pedido pendente de evento nos próximos `dias` dias (só publicadas).
 */
export function calcularPendencias(
  escalas: EscalaPend[],
  publicados: Set<string>,
  agora: Date,
  dias = 7,
): Pendencias {
  const ativos = new Set(
    escalas
      .filter((e) => e.papel === "titular" && (e.status === "pendente" || e.status === "confirmado"))
      .map((e) => `${e.eventoId}|${e.funcaoId}`),
  );
  const vistos = new Set<string>();
  const vagasAbertas: Pendencias["vagasAbertas"] = [];
  for (const e of escalas
    .filter((x) => x.status === "recusado" && x.papel === "titular" && publicados.has(x.eventoId))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const chave = `${e.eventoId}|${e.funcaoId}`;
    if (ativos.has(chave) || vistos.has(chave)) continue;
    vistos.add(chave);
    vagasAbertas.push({ eventoId: e.eventoId, funcao: e.funcao, evento: e.evento, inicio: e.inicio, recusou: e.pessoa, motivo: e.motivo });
  }
  const limite = agora.getTime() + dias * DIA_MS;
  const semResposta = escalas
    .filter((e) => e.status === "pendente" && publicados.has(e.eventoId) && new Date(e.inicio).getTime() <= limite)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((e) => ({ id: e.id, pessoa: e.pessoa, funcao: e.funcao, evento: e.evento, inicio: e.inicio }));
  return { vagasAbertas, semResposta };
}
