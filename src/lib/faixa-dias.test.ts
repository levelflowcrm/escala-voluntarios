import { describe, expect, it } from "vitest";
import { diaInicial, montarFaixa, somarDias } from "./faixa-dias";

describe("faixa de dias", () => {
  it("soma dias passando pela virada de mês e de ano", () => {
    expect(somarDias("2026-11-28", 5)).toBe("2026-12-03");
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("marca eventos, escala, hoje e o dia da semana", () => {
    const f = montarFaixa("2026-11-17", new Map([["2026-11-18", 2]]), new Set(["2026-11-18"]), 3);
    expect(f.map((d) => d.semana)).toEqual(["Ter", "Qua", "Qui"]);
    expect(f[0]).toMatchObject({ hoje: true, eventos: 0, escalado: false });
    expect(f[1]).toMatchObject({ numero: 18, eventos: 2, escalado: true, hoje: false });
  });
  it("abre em hoje se houver evento; senão no primeiro dia com evento; senão hoje", () => {
    const hoje = "2026-11-17";
    expect(diaInicial(montarFaixa(hoje, new Map([[hoje, 1]]), new Set()))).toBe(hoje);
    expect(diaInicial(montarFaixa(hoje, new Map([["2026-11-20", 1]]), new Set()))).toBe("2026-11-20");
    expect(diaInicial(montarFaixa(hoje, new Map(), new Set()))).toBe(hoje);
  });
});
