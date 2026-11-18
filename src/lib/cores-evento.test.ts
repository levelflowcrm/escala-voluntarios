import { describe, expect, it } from "vitest";
import { corDoEvento, CORES } from "./cores-evento";

describe("corDoEvento", () => {
  it("usa a cor escolhida quando válida", () => {
    expect(corDoEvento(null, "rosa")).toBe("rosa");
  });
  it("sem escolha, vale a cor padrão do tipo", () => {
    expect(corDoEvento("pessego", null)).toBe("pessego");
  });
  it("a escolha vence o padrão do tipo", () => {
    expect(corDoEvento("pessego", "azul")).toBe("azul");
  });
  it("sem escolha e sem padrão fica sem cor; cor desconhecida é ignorada", () => {
    expect(corDoEvento(null, null)).toBeNull();
    expect(corDoEvento("vermelho", "vermelho")).toBeNull();
  });
  it("toda cor da paleta tem classes para cartão e bolinha", () => {
    for (const c of Object.values(CORES)) expect(c.card && c.bolinha).toBeTruthy();
  });
});
