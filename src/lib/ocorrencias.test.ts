import { describe, expect, it } from "vitest";
import { cultoSugerido, ordenarOcorrencias, type CultoOpcao } from "./ocorrencias";

const culto = (id: string, inicio: string): CultoOpcao => ({ eventoId: id, ministerioId: "tm", titulo: id, inicio });
// Domingo 22/11/2026, 20:00 em São Paulo
const agora = new Date("2026-11-22T20:00:00-03:00");

describe("cultoSugerido", () => {
  it("sugere o culto que começou mais recentemente (durante ou logo depois)", () => {
    const opcoes = [culto("manha", "2026-11-22T09:00:00-03:00"), culto("noite", "2026-11-22T18:30:00-03:00")];
    expect(cultoSugerido(opcoes, agora)?.eventoId).toBe("noite");
  });

  it("antes do culto começar, sugere o próximo em até 3h", () => {
    const opcoes = [culto("quarta", "2026-11-18T19:30:00-03:00"), culto("noite", "2026-11-22T21:30:00-03:00")];
    expect(cultoSugerido(opcoes, agora)?.eventoId).toBe("noite");
  });

  it("não sugere culto de dias atrás nem muito à frente", () => {
    const opcoes = [culto("quarta", "2026-11-18T19:30:00-03:00"), culto("proxima", "2026-11-25T19:30:00-03:00")];
    expect(cultoSugerido(opcoes, agora)).toBeNull();
  });
});

describe("ordenarOcorrencias", () => {
  it("abertas urgentes primeiro, resolvidas por último", () => {
    const o = (id: string, status: "aberta" | "ciente" | "resolvida", gravidade: "informativa" | "normal" | "urgente", criadoEm: string) => ({
      id,
      status,
      gravidade,
      criadoEm,
    });
    const lista = ordenarOcorrencias([
      o("resolvida-urgente", "resolvida", "urgente", "2026-11-22T21:00:00Z"),
      o("aberta-normal", "aberta", "normal", "2026-11-22T22:00:00Z"),
      o("ciente", "ciente", "urgente", "2026-11-22T23:00:00Z"),
      o("aberta-urgente", "aberta", "urgente", "2026-11-22T20:00:00Z"),
    ]);
    expect(lista.map((x) => x.id)).toEqual(["aberta-urgente", "aberta-normal", "ciente", "resolvida-urgente"]);
  });
});
