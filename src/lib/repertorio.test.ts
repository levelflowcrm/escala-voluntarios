import { describe, expect, it } from "vitest";
import { formatarAtualizacao, podeProgramar, validarRepertorio, type Musica } from "./repertorio";

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

describe("podeProgramar (7h30 do dia do culto)", () => {
  const culto = "2026-11-22T22:00:00Z"; // domingo 19h em Brasília
  it("dias antes do culto: pode", () => expect(podeProgramar(culto, new Date("2026-11-20T15:00:00Z"))).toBe(true));
  it("no dia do culto antes das 7h30: pode", () => expect(podeProgramar(culto, new Date("2026-11-22T10:00:00Z"))).toBe(true)); // 7h00
  it("no dia do culto depois das 7h30: não pode", () => {
    expect(podeProgramar(culto, new Date("2026-11-22T10:30:00Z"))).toBe(false); // 7h30
    expect(podeProgramar(culto, new Date("2026-11-22T14:00:00Z"))).toBe(false);
  });
  it("culto que já passou: não pode", () => expect(podeProgramar(culto, new Date("2026-11-23T12:00:00Z"))).toBe(false));
});
