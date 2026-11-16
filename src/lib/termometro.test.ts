import { describe, expect, it } from "vitest";
import { aniversariantesDoMes, classificarCarga, type Carga } from "./termometro";

const c = (pessoaId: string, noventa: number): Carga => ({ pessoaId, nome: pessoaId, mes: 0, noventa, ultimo: null });

describe("classificarCarga", () => {
  it("marca quem está bem acima da média como alta e quem não serviu como baixa", () => {
    const n = classificarCarga([c("a", 9), c("b", 2), c("c", 2), c("d", 0)]);
    expect(n.get("a")).toBe("alta");
    expect(n.get("b")).toBe("equilibrada");
    expect(n.get("d")).toBe("baixa");
  });
  it("não marca ninguém como alta quando todos servem parecido", () => {
    const n = classificarCarga([c("a", 4), c("b", 4), c("c", 3)]);
    expect([...n.values()]).not.toContain("alta");
  });
  it("lida com lista vazia", () => {
    expect(classificarCarga([]).size).toBe(0);
  });
});

describe("aniversariantesDoMes", () => {
  it("filtra pelo mês, ordena pelo dia e ignora quem não informou", () => {
    const r = aniversariantesDoMes(
      [
        { nome: "Bia", aniversario: "1990-11-20" },
        { nome: "Ana", aniversario: "1985-11-03" },
        { nome: "Caio", aniversario: "2000-12-01" },
        { nome: "Davi", aniversario: null },
      ],
      11,
    );
    expect(r).toEqual([
      { nome: "Ana", dia: 3 },
      { nome: "Bia", dia: 20 },
    ]);
  });
});
