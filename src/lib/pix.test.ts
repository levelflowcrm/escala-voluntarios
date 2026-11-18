import { describe, expect, it } from "vitest";
import { CONTRIBUICAO, crc16 } from "./pix";

describe("pix", () => {
  it("calcula o CRC16/CCITT-FALSE padrão", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("o código de contribuição é um PIX estático íntegro (CRC válido, sem valor fixo)", () => {
    const c = CONTRIBUICAO.codigo;
    expect(c.startsWith("000201")).toBe(true);
    expect(c).toContain("br.gov.bcb.pix");
    const ids: string[] = [];
    for (let i = 0; i < c.length; ) {
      ids.push(c.slice(i, i + 2));
      i += 4 + Number(c.slice(i + 2, i + 4));
    }
    expect(ids).not.toContain("54"); // sem campo de valor: quem paga escolhe quanto
    expect(ids).toContain("63");
    expect(c.slice(-4)).toBe(crc16(c.slice(0, -4)));
  });
});
