import { describe, expect, it } from "vitest";
import { validarNovoVoluntario } from "./voluntario";

describe("validarNovoVoluntario", () => {
  it("normaliza nome, e-mail e celular", () => {
    expect(validarNovoVoluntario({ nome: "  Maria   Silva ", email: " Maria@Exemplo.com ", celular: " (11) 99999-0000 " })).toEqual({
      erro: null,
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      celular: "(11) 99999-0000",
    });
  });
  it("e-mail e celular são opcionais", () => {
    expect(validarNovoVoluntario({ nome: "João", email: "", celular: "" })).toEqual({ erro: null, nome: "João", email: null, celular: null });
  });
  it("recusa nome vazio, e-mail inválido e celular incompleto", () => {
    expect(validarNovoVoluntario({ nome: " ", email: "", celular: "" }).erro).toMatch(/nome/i);
    expect(validarNovoVoluntario({ nome: "Ana", email: "ana@", celular: "" }).erro).toMatch(/e-mail/i);
    expect(validarNovoVoluntario({ nome: "Ana", email: "", celular: "9999" }).erro).toMatch(/celular/i);
  });
});
