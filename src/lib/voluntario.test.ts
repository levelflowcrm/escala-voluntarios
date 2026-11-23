import { describe, expect, it } from "vitest";
import { validarNovoVoluntario } from "./voluntario";

const HOJE = "2026-11-22";
const ok = { nome: "João", email: "", celular: "(11) 99999-0000", aniversario: "1990-05-10" };

describe("validarNovoVoluntario", () => {
  it("normaliza nome, e-mail e celular", () => {
    expect(validarNovoVoluntario({ nome: "  Maria   Silva ", email: " Maria@Exemplo.com ", celular: " (11) 99999-0000 ", aniversario: "1985-03-02" }, HOJE)).toEqual({
      erro: null,
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      celular: "(11) 99999-0000",
      aniversario: "1985-03-02",
    });
  });
  it("e-mail é opcional", () => {
    expect(validarNovoVoluntario(ok, HOJE)).toEqual({ erro: null, nome: "João", email: null, celular: "(11) 99999-0000", aniversario: "1990-05-10" });
  });
  it("celular é obrigatório e precisa de DDD", () => {
    expect(validarNovoVoluntario({ ...ok, celular: "" }, HOJE).erro).toMatch(/celular/i);
    expect(validarNovoVoluntario({ ...ok, celular: "9999" }, HOJE).erro).toMatch(/celular/i);
  });
  it("data de nascimento é obrigatória e precisa ser real", () => {
    expect(validarNovoVoluntario({ ...ok, aniversario: "" }, HOJE).erro).toMatch(/nascimento/i);
    expect(validarNovoVoluntario({ ...ok, aniversario: "2027-01-01" }, HOJE).erro).toMatch(/inválida/i);
    expect(validarNovoVoluntario({ ...ok, aniversario: "1800-01-01" }, HOJE).erro).toMatch(/inválida/i);
    expect(validarNovoVoluntario({ ...ok, aniversario: "10/05/1990" }, HOJE).erro).toMatch(/inválida/i);
  });
  it("recusa nome vazio e e-mail inválido", () => {
    expect(validarNovoVoluntario({ ...ok, nome: " " }, HOJE).erro).toMatch(/nome/i);
    expect(validarNovoVoluntario({ ...ok, email: "ana@" }, HOJE).erro).toMatch(/e-mail/i);
  });
});
