import { describe, expect, it } from "vitest";
import { diaDaSemana, emPausa, moverParaDiaDaSemana, somarDias, validarCultoFixo } from "./cultos";

describe("datas dos cultos", () => {
  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-11-30", 1)).toBe("2026-12-01");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("move para outro dia da semana na mesma semana (domingo a sábado)", () => {
    expect(diaDaSemana("2026-11-22")).toBe(0); // domingo
    expect(moverParaDiaDaSemana("2026-11-22", 3)).toBe("2026-11-25"); // quarta da mesma semana
    expect(moverParaDiaDaSemana("2026-11-25", 0)).toBe("2026-11-22"); // volta ao domingo
    expect(moverParaDiaDaSemana("2026-11-25", 3)).toBe("2026-11-25"); // mesmo dia
  });
});

describe("emPausa", () => {
  const pausas = [
    { tipo_evento_id: null, de: "2026-12-24", ate: "2026-12-26" },
    { tipo_evento_id: "quarta", de: "2026-12-02", ate: "2026-12-02" },
  ];
  it("pausa geral vale para qualquer culto, incluindo as pontas", () => {
    expect(emPausa("2026-12-24", "domingo", pausas)).toBe(true);
    expect(emPausa("2026-12-26", "quarta", pausas)).toBe(true);
    expect(emPausa("2026-12-27", "domingo", pausas)).toBe(false);
  });
  it("pausa de um culto não vale para os outros", () => {
    expect(emPausa("2026-12-02", "quarta", pausas)).toBe(true);
    expect(emPausa("2026-12-02", "domingo", pausas)).toBe(false);
  });
});

describe("validarCultoFixo", () => {
  it("aceita dados corretos e recusa os inválidos", () => {
    expect(validarCultoFixo({ nome: "Culto de Domingo", diaSemana: 0, hora: "18:30" }).erro).toBeNull();
    expect(validarCultoFixo({ nome: " ", diaSemana: 0, hora: "18:30" }).erro).toMatch(/nome/i);
    expect(validarCultoFixo({ nome: "Culto", diaSemana: 7, hora: "18:30" }).erro).toMatch(/dia/i);
    expect(validarCultoFixo({ nome: "Culto", diaSemana: 3, hora: "25:00" }).erro).toMatch(/hor/i);
  });
});
