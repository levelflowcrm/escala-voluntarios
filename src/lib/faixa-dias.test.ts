import { describe, expect, it } from "vitest";
import { diaInicial, montarFaixa, somarDias } from "./faixa-dias";

describe("faixa de dias", () => {
  it("soma dias passando pela virada de mês e de ano", () => {
    expect(somarDias("2026-11-28", 5)).toBe("2026-12-03");
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("mostra só os dias com evento, a partir de hoje, em ordem", () => {
    const eventos = new Map([["2026-11-20", 1], ["2026-11-16", 3], ["2026-11-18", 2]]);
    const f = montarFaixa("2026-11-17", eventos, new Set(["2026-11-18"]));
    expect(f.map((d) => d.dia)).toEqual(["2026-11-18", "2026-11-20"]);
    expect(f[0]).toMatchObject({ numero: 18, semana: "Qua", eventos: 2, escalado: true, hoje: false });
    expect(f[1]).toMatchObject({ escalado: false });
  });
  it("marca hoje quando há evento hoje", () => {
    const f = montarFaixa("2026-11-17", new Map([["2026-11-17", 1]]), new Set());
    expect(f[0]).toMatchObject({ hoje: true, semana: "Ter" });
  });
  it("abre em hoje se houver evento; senão no primeiro dia com evento; sem eventos, hoje", () => {
    const hoje = "2026-11-17";
    expect(diaInicial(montarFaixa(hoje, new Map([[hoje, 1]]), new Set()), hoje)).toBe(hoje);
    expect(diaInicial(montarFaixa(hoje, new Map([["2026-11-20", 1]]), new Set()), hoje)).toBe("2026-11-20");
    expect(diaInicial(montarFaixa(hoje, new Map(), new Set()), hoje)).toBe(hoje);
  });
});
