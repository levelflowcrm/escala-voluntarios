import { describe, expect, it } from "vitest";
import { codigoPix, crc16, CONTRIBUICAO } from "./pix";

describe("pix", () => {
  it("calcula o CRC16/CCITT-FALSE padrão", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("monta o código copia e cola com a chave, nome sem acento e CRC válido", () => {
    const codigo = codigoPix({ chave: "31825144826", nome: "José Açaí", cidade: "São Paulo" });
    expect(codigo.startsWith("000201")).toBe(true);
    expect(codigo).toContain("0014br.gov.bcb.pix0111" + "31825144826");
    expect(codigo).toContain("5909JOSE ACAI");
    expect(codigo).toContain("6009SAO PAULO");
    const semCrc = codigo.slice(0, -4);
    expect(semCrc.endsWith("6304")).toBe(true);
    expect(codigo.slice(-4)).toBe(crc16(semCrc));
  });

  it("a chave configurada é o CPF só com números", () => {
    expect(CONTRIBUICAO.chave).toMatch(/^\d{11}$/);
    expect(CONTRIBUICAO.chaveFormatada.replace(/\D/g, "")).toBe(CONTRIBUICAO.chave);
  });
});
