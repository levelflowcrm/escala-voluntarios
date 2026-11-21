/** Ocorrências: textos, ordem da lista e escolha do culto sugerido no formulário. */

export type TipoOcorrencia = "equipamento" | "tecnico" | "equipe" | "pessoas" | "seguranca" | "estrutura" | "programacao" | "outro";
export type Gravidade = "informativa" | "normal" | "urgente";
export type StatusOcorrencia = "aberta" | "ciente" | "resolvida";

/** Tipos amplos, para qualquer ministério (o aviso vai para o facilitador do ministério escolhido). */
export const TIPOS: { valor: TipoOcorrencia; texto: string; icone: string; exemplos: string }[] = [
  { valor: "equipamento", texto: "Equipamento ou material", icone: "🔧", exemplos: "quebrou, faltou, sem bateria" },
  { valor: "tecnico", texto: "Som, imagem ou transmissão", icone: "🎛️", exemplos: "microfone, telão, sinal caiu" },
  { valor: "equipe", texto: "Equipe ou escala", icone: "👥", exemplos: "falta, atraso, time desfalcado" },
  { valor: "pessoas", texto: "Atendimento a pessoas", icone: "🙋", exemplos: "visitante, membro, criança" },
  { valor: "seguranca", texto: "Segurança ou saúde", icone: "🩹", exemplos: "acidente, mal-estar, risco" },
  { valor: "estrutura", texto: "Espaço e estrutura", icone: "🏛️", exemplos: "limpeza, ar-condicionado, cadeiras" },
  { valor: "programacao", texto: "Programação ou horário", icone: "⏱️", exemplos: "atraso, mudança na ordem" },
  { valor: "outro", texto: "Outro", icone: "📝", exemplos: "qualquer outra situação" },
];

export const GRAVIDADES: { valor: Gravidade; texto: string; dica: string }[] = [
  { valor: "informativa", texto: "Só para registro", dica: "Nada a resolver agora" },
  { valor: "normal", texto: "Precisa de atenção", dica: "Resolver antes do próximo culto" },
  { valor: "urgente", texto: "Urgente", dica: "Atrapalhou o culto ou pode atrapalhar o próximo" },
];

export type CultoOpcao = { eventoId: string; ministerioId: string; titulo: string; inicio: string };

const HORA = 3_600_000;

/**
 * Culto sugerido para a ocorrência: o que começou mais recentemente nas últimas 12h
 * (o voluntário costuma registrar durante ou logo depois do culto); se nenhum começou,
 * o próximo que começa em até 3h. Fora disso, nenhum (o voluntário escolhe).
 */
export function cultoSugerido(opcoes: CultoOpcao[], agora = new Date()): CultoOpcao | null {
  const t = agora.getTime();
  const comecados = opcoes
    .filter((o) => {
      const i = new Date(o.inicio).getTime();
      return i <= t && t - i <= 12 * HORA;
    })
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  if (comecados.length) return comecados[0];
  const proximos = opcoes
    .filter((o) => {
      const i = new Date(o.inicio).getTime();
      return i > t && i - t <= 3 * HORA;
    })
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  return proximos[0] ?? null;
}

/** Ordem para o facilitador: abertas primeiro (urgentes no topo), depois cientes, depois resolvidas; mais novas antes. */
export function ordenarOcorrencias<T extends { status: StatusOcorrencia; gravidade: Gravidade; criadoEm: string }>(lista: T[]): T[] {
  const st: Record<StatusOcorrencia, number> = { aberta: 0, ciente: 1, resolvida: 2 };
  const gr: Record<Gravidade, number> = { urgente: 0, normal: 1, informativa: 2 };
  return [...lista].sort(
    (a, b) =>
      st[a.status] - st[b.status] ||
      (a.status === "resolvida" ? 0 : gr[a.gravidade] - gr[b.gravidade]) ||
      b.criadoEm.localeCompare(a.criadoEm),
  );
}
