/** Limites e validação do POP (Procedimento Operacional Padrão) do time. */
export const POP_MAX_TEXTO = 20000;

/** Aceita só links http(s). Vazio vira null. Retorna `erro` quando o link é inválido. */
export function validarLinkPop(bruto: string): { link: string | null; erro: string | null } {
  const l = bruto.trim();
  if (!l) return { link: null, erro: null };
  if (l.length > 500) return { link: null, erro: "Link muito longo" };
  try {
    const u = new URL(l);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocolo");
    return { link: u.toString(), erro: null };
  } catch {
    return { link: null, erro: "O link precisa começar com http:// ou https://" };
  }
}
