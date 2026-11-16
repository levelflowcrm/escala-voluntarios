const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NovoVoluntario = { nome: string; email: string; celular: string };

/** Valida e normaliza os dados do formulário "Adicionar voluntário". */
export function validarNovoVoluntario(d: NovoVoluntario):
  | { erro: string }
  | { erro: null; nome: string; email: string | null; celular: string | null } {
  const nome = d.nome.trim().replace(/\s+/g, " ");
  const email = d.email.trim().toLowerCase();
  const celular = d.celular.trim();
  if (nome.length < 2) return { erro: "Informe o nome do voluntário" };
  if (email && !EMAIL.test(email)) return { erro: "E-mail inválido" };
  if (celular && celular.replace(/\D/g, "").length < 10) return { erro: "Celular incompleto (use DDD + número)" };
  return { erro: null, nome, email: email || null, celular: celular || null };
}
