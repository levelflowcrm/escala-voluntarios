import { describe, expect, it } from "vitest";
import { agruparTime, type LinhaTime } from "./time-de-hoje";

const l = (p: Partial<LinhaTime>): LinhaTime => ({
  evento_id: "e1", evento: "Culto", inicio: "2026-11-22T13:00:00Z", ministerio_id: "m1", ministerio: "Transmissão",
  pessoa_id: "p", nome: "Ana", funcao: null, status: "confirmado", foto: null, aniversario_hoje: false, sou_eu: false, ...p,
});

describe("agruparTime", () => {
  it("agrupa por evento e ministério", () => {
    const g = agruparTime([l({ pessoa_id: "a", sou_eu: true }), l({ pessoa_id: "b" }), l({ pessoa_id: "c", ministerio_id: "m2", ministerio: "Projeção" }), l({ pessoa_id: "d", ministerio_id: "m2", ministerio: "Projeção", sou_eu: true })]);
    expect(g.map((x) => [x.ministerio, x.pessoas.length])).toEqual([["Transmissão", 2], ["Projeção", 2]]);
  });
  it("descarta time em que só eu estou escalado", () => {
    expect(agruparTime([l({ sou_eu: true })])).toEqual([]);
  });
});
