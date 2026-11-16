import { describe, expect, it } from "vitest";
import { calcularPendencias, type EscalaPend } from "./pendencias";

const base = { papel: "titular", motivo: null, funcao: "Câmera Black", evento: "Culto", inicio: "2026-11-18T22:30:00Z" };
const e = (o: Partial<EscalaPend> & { id: string; eventoId: string; funcaoId: string; status: string; pessoa: string }): EscalaPend => ({ ...base, ...o });
const agora = new Date("2026-11-16T12:00:00Z");

describe("calcularPendencias", () => {
  it("lista vaga aberta quando houve recusa e ninguém ocupa a função", () => {
    const r = calcularPendencias([e({ id: "1", eventoId: "ev", funcaoId: "f", status: "recusado", pessoa: "Ana" })], new Set(["ev"]), agora);
    expect(r.vagasAbertas).toHaveLength(1);
    expect(r.vagasAbertas[0].recusou).toBe("Ana");
  });
  it("não lista se outra pessoa já assumiu ou foi escalada", () => {
    const r = calcularPendencias(
      [
        e({ id: "1", eventoId: "ev", funcaoId: "f", status: "recusado", pessoa: "Ana" }),
        e({ id: "2", eventoId: "ev", funcaoId: "f", status: "confirmado", pessoa: "Bia" }),
      ],
      new Set(["ev"]),
      agora,
    );
    expect(r.vagasAbertas).toHaveLength(0);
  });
  it("ignora escalas ainda em rascunho (não publicadas)", () => {
    const r = calcularPendencias([e({ id: "1", eventoId: "ev", funcaoId: "f", status: "recusado", pessoa: "Ana" })], new Set(), agora);
    expect(r.vagasAbertas).toHaveLength(0);
  });
  it("conta uma vaga só uma vez mesmo com várias recusas", () => {
    const r = calcularPendencias(
      [
        e({ id: "1", eventoId: "ev", funcaoId: "f", status: "recusado", pessoa: "Ana" }),
        e({ id: "2", eventoId: "ev", funcaoId: "f", status: "recusado", pessoa: "Bia" }),
      ],
      new Set(["ev"]),
      agora,
    );
    expect(r.vagasAbertas).toHaveLength(1);
  });
  it("lista pendentes só dos próximos 7 dias", () => {
    const r = calcularPendencias(
      [
        e({ id: "1", eventoId: "ev", funcaoId: "f", status: "pendente", pessoa: "Ana" }),
        e({ id: "2", eventoId: "ev2", funcaoId: "f", status: "pendente", pessoa: "Bia", inicio: "2026-12-20T22:30:00Z" }),
      ],
      new Set(["ev", "ev2"]),
      agora,
    );
    expect(r.semResposta.map((x) => x.pessoa)).toEqual(["Ana"]);
  });
});
