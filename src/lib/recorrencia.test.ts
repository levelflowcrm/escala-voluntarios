import { describe, expect, it } from "vitest";
import { gerarOcorrencias } from "./recorrencia";

describe("gerarOcorrencias", () => {
  it("sem repetição devolve só a data", () => {
    expect(gerarOcorrencias("2026-12-05", "nenhuma", "2027-12-05")).toEqual(["2026-12-05"]);
  });
  it("semanal e quinzenal", () => {
    expect(gerarOcorrencias("2026-12-02", "semanal", "2026-12-23")).toEqual(["2026-12-02", "2026-12-09", "2026-12-16", "2026-12-23"]);
    expect(gerarOcorrencias("2026-12-02", "quinzenal", "2027-01-06")).toEqual(["2026-12-02", "2026-12-16", "2026-12-30"]);
  });
  it("mensal no mesmo dia ajusta meses curtos", () => {
    expect(gerarOcorrencias("2027-01-31", "mensal_dia", "2027-04-30")).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
  });
  it("mensal na mesma semana: 1º sábado de cada mês", () => {
    // 05/12/2026 é o 1º sábado de dezembro
    expect(gerarOcorrencias("2026-12-05", "mensal_semana", "2027-03-31")).toEqual(["2026-12-05", "2027-01-02", "2027-02-06", "2027-03-06"]);
  });
  it("5º dia da semana inexistente cai no último do mês", () => {
    // 5º sábado de maio/2027 = 29/05; em junho/2027 só há 4 sábados -> 26/06
    expect(gerarOcorrencias("2027-05-29", "mensal_semana", "2027-06-30")).toEqual(["2027-05-29", "2027-06-26"]);
  });
  it("limita a 60 ocorrências", () => {
    expect(gerarOcorrencias("2026-01-01", "semanal", "2040-01-01")).toHaveLength(60);
  });
});
