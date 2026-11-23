const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NovoVoluntario = { nome: string; email: string; celular: string; aniversario: string };

/** Valida e normaliza os dados do formulário "Adicionar voluntário". `hoje` no formato AAAA-MM-DD. */
export function validarNovoVoluntario(
  d: NovoVoluntario,
  hoje: string = new Date().toISOString().slice(0, 10),
):
  | { erro: string }
  | { erro: null; nome: string; email: string | null; celular: string; aniversario: string } {
  const nome = d.nome.trim().replace(/\s+/g, " ");
  const email = d.email.trim().toLowerCase();
  const celular = d.celular.trim();
  const aniversario = d.aniversario.trim();
  if (nome.length < 2) return { erro: "Informe o nome do voluntário" };
  if (email && !EMAIL.test(email)) return { erro: "E-mail inválido" };
  if (!celular) return { erro: "Informe o celular com DDD (é por ele que o time recebe os avisos)" };
  if (celular.replace(/\D/g, "").length < 10) return { erro: "Celular incompleto (use DDD + número)" };
  if (!aniversario) return { erro: "Informe a data de nascimento" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aniversario) || Number.isNaN(Date.parse(aniversario))) return { erro: "Data de nascimento inválida" };
  if (aniversario > hoje || aniversario < "1900-01-01") return { erro: "Data de nascimento inválida" };
  return { erro: null, nome, email: email || null, celular, aniversario };
}
