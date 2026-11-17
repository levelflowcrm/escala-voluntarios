import { describe, expect, it } from "vitest";
import { chegouNoHorario, situacaoChegada } from "./chegada";

const inicio = "2026-11-22T22:30:00Z"; // 19h30 em Brasília

describe("situacaoChegada", () => {
  it("só abre 3 horas antes", () => {
    expect(situacaoChegada(inicio, new Date("2026-11-22T19:29:59Z"))).toBe("cedo");
    expect(situacaoChegada(inicio, new Date("2026-11-22T19:30:00Z"))).toBe("aberta");
  });
  it("fica aberta durante o evento e fecha 4 horas depois do início", () => {
    expect(situacaoChegada(inicio, new Date("2026-11-22T22:30:00Z"))).toBe("aberta");
    expect(situacaoChegada(inicio, new Date("2026-11-23T02:30:00Z"))).toBe("aberta");
    expect(situacaoChegada(inicio, new Date("2026-11-23T02:30:01Z"))).toBe("encerrada");
  });
});

describe("chegouNoHorario", () => {
  it("até o início conta como no horário", () => {
    expect(chegouNoHorario(inicio, "2026-11-22T22:29:00Z")).toBe(true);
    expect(chegouNoHorario(inicio, "2026-11-22T22:30:00Z")).toBe(true);
    expect(chegouNoHorario(inicio, "2026-11-22T22:31:00Z")).toBe(false);
  });
});
