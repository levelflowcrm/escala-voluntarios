import { describe, expect, it } from "vitest";
import { deveAvisarDisponibilidade, proximoMes } from "./disponibilidade-mes";

describe("proximoMes", () => {
  it("novembro -> dezembro", () => {
    expect(proximoMes("2026-11-22")).toEqual({ mes: "2026-12-01", nome: "dezembro" });
  });
  it("dezembro vira janeiro do ano seguinte", () => {
    expect(proximoMes("2026-12-20")).toEqual({ mes: "2027-01-01", nome: "janeiro" });
  });
  it("janeiro -> fevereiro", () => {
    expect(proximoMes("2027-01-05").nome).toBe("fevereiro");
  });
});

describe("deveAvisarDisponibilidade", () => {
  it("só a partir do dia 15", () => {
    expect(deveAvisarDisponibilidade("2026-11-14")).toBe(false);
    expect(deveAvisarDisponibilidade("2026-11-15")).toBe(true);
    expect(deveAvisarDisponibilidade("2026-11-30")).toBe(true);
  });
});
