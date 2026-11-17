import { describe, expect, it } from "vitest";
import { proximosAniversarios } from "./aniversarios";

const p = (nome: string, aniversario: string | null) => ({ nome, aniversario });

describe("proximosAniversarios", () => {
  it("separa hoje, próximos e ignora quem está fora da janela ou não informou", () => {
    const r = proximosAniversarios(
      [p("Hoje", "1990-11-17"), p("Amanhã", "1985-11-18"), p("Daqui 29", "2000-12-16"), p("Longe", "2000-12-18"), p("Sem data", null), p("Ontem", "1990-11-16")],
      "2026-11-17",
    );
    expect(r.map((x) => [x.nome, x.faltam])).toEqual([["Hoje", 0], ["Amanhã", 1], ["Daqui 29", 29]]);
  });
  it("passa pela virada do ano", () => {
    const r = proximosAniversarios([p("Ana", "1990-01-05"), p("Bia", "1990-12-20")], "2026-12-28");
    expect(r.map((x) => [x.nome, x.faltam])).toEqual([["Ana", 8]]);
  });
  it("29/02 vira 28/02 em ano não bissexto e 29/02 em bissexto", () => {
    expect(proximosAniversarios([p("Leo", "2000-02-29")], "2027-02-20")[0].faltam).toBe(8);
    expect(proximosAniversarios([p("Leo", "2000-02-29")], "2028-02-20")[0].faltam).toBe(9);
  });
  it("ordena por proximidade e depois por nome", () => {
    const r = proximosAniversarios([p("Zé", "1990-11-20"), p("Ana", "1990-11-20"), p("Bia", "1990-11-18")], "2026-11-17");
    expect(r.map((x) => x.nome)).toEqual(["Bia", "Ana", "Zé"]);
  });
});
