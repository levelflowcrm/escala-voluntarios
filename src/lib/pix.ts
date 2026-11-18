/** Código PIX "copia e cola" (estático, sem valor) gerado a partir de uma chave PIX aleatória (sem CPF) para a contribuição ao Mais Conectados. */
export const CONTRIBUICAO = {
  codigo: "00020126890014br.gov.bcb.pix0136f3c95734-475d-4c52-a6bf-e6503b9a4ebd0227Contribuicao_MaisConectados5204000053039865802BR5925LUCIANO_ALVES_DE_OLIVEIRA6009GUARULHOS62180514MaisConectados630465AA",
  favorecido: "Luciano Alves de Oliveira",
};

/** CRC16/CCITT-FALSE usado pelo BR Code do PIX. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
