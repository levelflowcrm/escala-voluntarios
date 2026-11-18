export type TipoEvento = { id: string; nome: string; cor: string | null; ativo: boolean };

/** Nome do tipo de evento: sem espaços sobrando, de 2 a 60 letras. Devolve o nome limpo ou a mensagem de erro. */
export function validarNomeTipo(bruto: string): { nome: string; erro: null } | { nome: null; erro: string } {
  const nome = bruto.replace(/\s+/g, " ").trim();
  if (nome.length < 2) return { nome: null, erro: "Dê um nome ao tipo (mínimo 2 letras)" };
  if (nome.length > 60) return { nome: null, erro: "Nome muito longo (máximo 60 letras)" };
  return { nome, erro: null };
}

/** Ordem alfabética em português: ignora maiúsculas/minúsculas e acentos ("Ação social" fica entre "A" e "B", "TREINAMENTO" junto dos "T"). */
export function emOrdemAlfabetica<T extends { nome: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base", numeric: true }));
}
