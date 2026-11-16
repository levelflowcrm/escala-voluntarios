import { describe, expect, it } from "vitest";
import { corDoEvento, CORES } from "./cores-evento";

describe("corDoEvento", () => {
  it("usa a cor escolhida quando válida", () => {
    expect(corDoEvento("batismo", "rosa")).toBe("rosa");
  });
  it("locação (evento extra) tem pêssego por padrão", () => {
    expect(corDoEvento("locacao", null)).toBe("pessego");
  });
  it("a escolha vence o padrão do tipo", () => {
    expect(corDoEvento("locacao", "azul")).toBe("azul");
  });
  it("sem escolha e sem padrão fica sem cor; cor desconhecida é ignorada", () => {
    expect(corDoEvento("ensaio", null)).toBeNull();
    expect(corDoEvento("ensaio", "vermelho")).toBeNull();
    expect(corDoEvento(null, null)).toBeNull();
  });
  it("toda cor da paleta tem classes para cartão e bolinha", () => {
    for (const c of Object.values(CORES)) expect(c.card && c.bolinha).toBeTruthy();
  });
});
