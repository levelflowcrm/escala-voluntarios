import { describe, expect, it } from "vitest";
import { diasDaSemanaNoMes, inicioNoFuso, limitesMes, mesAtual, somarMes } from "./datas";

describe("datas", () => {
  it("soma meses virando o ano", () => {
    expect(somarMes("2026-12", 1)).toBe("2027-01");
    expect(somarMes("2026-01", -1)).toBe("2025-12");
  });
  it("mês atual usa o fuso de São Paulo", () => {
    expect(mesAtual(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11");
  });
  it("limites do mês", () => {
    expect(limitesMes("2026-12")).toEqual({ inicio: "2026-12-01T00:00:00-03:00", fim: "2027-01-01T00:00:00-03:00" });
  });
  it("domingos e quartas de dezembro/2026", () => {
    expect(diasDaSemanaNoMes("2026-12", 0)).toEqual(["2026-12-06", "2026-12-13", "2026-12-20", "2026-12-27"]);
    expect(diasDaSemanaNoMes("2026-12", 3)).toEqual(["2026-12-02", "2026-12-09", "2026-12-16", "2026-12-23", "2026-12-30"]);
  });
  it("horário do culto no fuso", () => {
    expect(new Date(inicioNoFuso("2026-12-06", "18:30:00")).toISOString()).toBe("2026-12-06T21:30:00.000Z");
  });
});
