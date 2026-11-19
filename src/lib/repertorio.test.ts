import { describe, expect, it } from "vitest";
import { formatarAtualizacao, validarRepertorio, type Musica } from "./repertorio";

const m = (bloco: Musica["bloco"], titulo = "Música"): Musica => ({ bloco, titulo, artista: "", tom: "" });
const base = [m("abertura"), m("abertura"), m("abertura"), m("encerramento")];

describe("validarRepertorio", () => {
  it("confere o tom de cada música", () => {
    expect(validarRepertorio([{ ...m("abertura"), tom: "Bb" }, m("abertura"), m("abertura"), m("encerramento")])).toBeNull();
    expect(validarRepertorio([{ ...m("abertura"), tom: "X" }, m("abertura"), m("abertura"), m("encerramento")])).toMatch(/Tom inválido/);
  });
  it("aceita 3 de abertura + encerramento, com ou sem ofertório", () => {
    expect(validarRepertorio(base)).toBeNull();
    expect(validarRepertorio([...base, m("ofertorio")])).toBeNull();
  });
  it("aceita 4 de abertura e recusa 2 ou 5", () => {
    expect(validarRepertorio([...base, m("abertura")])).toBeNull();
    expect(validarRepertorio([m("abertura"), m("abertura"), m("encerramento")])).toMatch(/3 a 4/);
    expect(validarRepertorio([...base, m("abertura"), m("abertura")])).toMatch(/3 a 4/);
  });
  it("exige exatamente 1 de encerramento e no máximo 1 de ofertório", () => {
    expect(validarRepertorio(base.slice(0, 3))).toMatch(/encerramento/);
    expect(validarRepertorio([...base, m("encerramento")])).toMatch(/encerramento/);
    expect(validarRepertorio([...base, m("ofertorio"), m("ofertorio")])).toMatch(/ofertório/);
  });
  it("recusa título vazio", () => {
    expect(validarRepertorio([...base.slice(0, 2), m("abertura", "  "), base[3]])).toMatch(/título/);
  });
});

describe("formatarAtualizacao", () => {
  it("mostra dia/mês e hora de Brasília", () => {
    expect(formatarAtualizacao("2026-11-18T22:13:00Z")).toBe("18/nov às 19:13");
    expect(formatarAtualizacao("2026-12-01T02:05:00Z")).toBe("30/nov às 23:05");
  });
});
