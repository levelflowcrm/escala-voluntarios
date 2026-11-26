/** Envio do PDF do relatório por WhatsApp (Uazapi, mesma instância dos avisos do app). */

export async function enviarDocumento(numero: string, pdf: Uint8Array, nomeArquivo: string, legenda: string): Promise<{ ok: boolean; erro?: string }> {
  const base = process.env.UAZAPI_URL?.trim().replace(/\/+$/, "");
  const token = process.env.UAZAPI_TOKEN?.trim();
  if (!base || !token) return { ok: false, erro: "uazapi_nao_configurada" };
  try {
    const r = await fetch(`${base}/send/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: numero, type: "document", file: Buffer.from(pdf).toString("base64"), docName: nomeArquivo, text: legenda }),
      signal: AbortSignal.timeout(20_000),
    });
    return r.ok ? { ok: true } : { ok: false, erro: `http_${r.status}` };
  } catch (e) {
    // Só o tipo da falha: nunca URL, token nem telefone.
    return { ok: false, erro: `falha_de_rede:${e instanceof Error ? e.name : "desconhecido"}` };
  }
}

/** "Culto de Domingo 26/11" → "relatorio-culto-de-domingo-26-11.pdf" */
export function nomeDoArquivo(titulo: string, inicio: Date): string {
  const slug = titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `relatorio-${slug || "culto"}-${inicio.toISOString().slice(0, 10)}.pdf`;
}
