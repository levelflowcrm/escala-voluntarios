export type LinhaTime = {
  evento_id: string;
  evento: string;
  inicio: string;
  ministerio_id: string;
  ministerio: string;
  pessoa_id: string;
  nome: string;
  funcao: string | null;
  status: string;
  foto: string | null;
  aniversario_hoje: boolean;
  sou_eu: boolean;
};

export type GrupoTime = { chave: string; evento: string; inicio: string; ministerio: string; pessoas: LinhaTime[] };

/** Agrupa por evento + ministério (na ordem que veio do banco) e só mantém times com mais alguém além de mim. */
export function agruparTime(linhas: LinhaTime[]): GrupoTime[] {
  const grupos = new Map<string, GrupoTime>();
  for (const l of linhas) {
    const chave = `${l.evento_id}:${l.ministerio_id}`;
    const g = grupos.get(chave) ?? { chave, evento: l.evento, inicio: l.inicio, ministerio: l.ministerio, pessoas: [] };
    g.pessoas.push(l);
    grupos.set(chave, g);
  }
  return [...grupos.values()].filter((g) => g.pessoas.some((p) => !p.sou_eu));
}
