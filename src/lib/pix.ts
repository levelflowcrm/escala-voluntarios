/** Chave PIX e texto da tela "Apoie o Mais Conectados". */
export const CONTRIBUICAO = {
  chave: "31825144826", // CPF, só os números
  chaveFormatada: "318.251.448-26",
  nome: "LUCIANO OLIVEIRA",
  cidade: "GUARULHOS",
};

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** CRC16/CCITT-FALSE usado pelo BR Code do PIX. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Código "copia e cola" do PIX estático (sem valor: quem paga escolhe quanto).
 * Nome (até 25) e cidade (até 15) em maiúsculas e sem acento, como o BR Code exige.
 */
export function codigoPix({ chave, nome, cidade }: { chave: string; nome: string; cidade: string }): string {
  const limpo = (t: string, max: number) =>
    t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().slice(0, max);
  const corpo =
    campo("00", "01") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("58", "BR") +
    campo("59", limpo(nome, 25)) +
    campo("60", limpo(cidade, 15)) +
    campo("62", campo("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}
