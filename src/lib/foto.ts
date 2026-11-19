const PREFIXO = "data:image/jpeg;base64,";
export const MAX_FOTO = 200_000; // caracteres do texto base64 (≈ 150 KB), igual ao limite do banco

/** Confere o texto da foto (JPEG em base64, pequeno). Devolve a mensagem de erro ou null. */
export function validarFoto(dataUrl: string): string | null {
  if (!dataUrl.startsWith(PREFIXO)) return "A foto precisa ser uma imagem (JPEG).";
  if (dataUrl.length > MAX_FOTO) return "A foto ficou grande demais. Tente outra.";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataUrl.slice(PREFIXO.length))) return "Foto inválida.";
  return null;
}

/** Só no navegador: recorta o centro em quadrado, reduz para `lado` px e devolve um JPEG em texto base64. */
export async function reduzirFoto(arquivo: File, lado = 320): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const corte = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.drawImage(bitmap, (bitmap.width - corte) / 2, (bitmap.height - corte) / 2, corte, corte, 0, 0, lado, lado);
  bitmap.close();
  for (const q of [0.85, 0.7, 0.55]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= MAX_FOTO) return url;
  }
  throw new Error("foto grande demais");
}
