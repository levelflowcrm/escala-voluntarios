import { describe, expect, it } from "vitest";
import { infoData, sugerirEscala, type VoluntarioEntrada } from "./sugerir";

const funcoes = [
  { id: "dtv", nome: "DTV-Transmissão" },
  { id: "black", nome: "Câmera Black" },
  { id: "grua", nome: "Câmera Grua" },
];
const todas = funcoes.map((f) => f.id);

// Dezembro/2026: dom 06 é o 1º domingo, qua 09, dom 13
const domManha = { id: "dom06m", inicio: "2026-12-06T09:00:00-03:00" };
const domNoite = { id: "dom06n", inicio: "2026-12-06T18:30:00-03:00" };
const qua = { id: "qua09", inicio: "2026-12-09T19:30:00-03:00" };
const dom13 = { id: "dom13n", inicio: "2026-12-13T18:30:00-03:00" };
const opcoes = { hoje: new Date("2026-12-01T12:00:00-03:00") };

function pessoas(n: number, extra: Partial<VoluntarioEntrada> = {}): VoluntarioEntrada[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, nome: `Pessoa ${i}`, funcoesAptas: todas, ...extra }));
}

describe("infoData", () => {
  it("usa o fuso de São Paulo e identifica o 1º domingo à noite", () => {
    const d = infoData("2026-12-06T21:30:00Z"); // 18:30 em SP
    expect(d).toMatchObject({ dia: "2026-12-06", diaSemana: 0, periodo: "noite", ordemNoMes: 1 });
  });
});

describe("sugerirEscala", () => {
  it("preenche todas as vagas sem repetir pessoa no mesmo evento", () => {
    const r = sugerirEscala([dom13], funcoes, pessoas(5), [], opcoes);
    expect(r.atribuicoes).toHaveLength(3);
    expect(new Set(r.atribuicoes.map((a) => a.pessoaId)).size).toBe(3);
    expect(r.vagasSemCandidato).toHaveLength(0);
  });

  it("só escala quem é apto na função", () => {
    const vs: VoluntarioEntrada[] = [
      { id: "a", nome: "Ana", funcoesAptas: ["dtv"] },
      { id: "b", nome: "Bia", funcoesAptas: ["black"] },
    ];
    const r = sugerirEscala([dom13], funcoes, vs, [], opcoes);
    expect(r.atribuicoes.find((a) => a.funcaoId === "dtv")?.pessoaId).toBe("a");
    expect(r.atribuicoes.find((a) => a.funcaoId === "black")?.pessoaId).toBe("b");
    expect(r.vagasSemCandidato).toEqual([{ eventoId: "dom13n", funcaoId: "grua" }]);
  });

  it("respeita 'não sirvo no 1º domingo' e bloqueio de viagem", () => {
    const vs: VoluntarioEntrada[] = [
      { id: "a", nome: "Ana", funcoesAptas: ["dtv"], indisponibilidades: [{ diaSemana: 0, ordemNoMes: 1 }] },
      { id: "b", nome: "Bia", funcoesAptas: ["dtv"], bloqueios: [{ inicio: "2026-12-05", fim: "2026-12-07" }] },
      { id: "c", nome: "Caio", funcoesAptas: ["dtv"] },
    ];
    const r = sugerirEscala([domNoite], [funcoes[0]], vs, [], opcoes);
    expect(r.atribuicoes[0].pessoaId).toBe("c");
  });

  it("respeita indisponibilidade só de um turno", () => {
    const vs: VoluntarioEntrada[] = [
      { id: "a", nome: "Ana", funcoesAptas: ["dtv"], indisponibilidades: [{ diaSemana: 3, periodo: "noite" }] },
      { id: "b", nome: "Bia", funcoesAptas: ["dtv"] },
    ];
    expect(sugerirEscala([qua], [funcoes[0]], vs, [], opcoes).atribuicoes[0].pessoaId).toBe("b");
    // No domingo de manhã a Ana pode
    const r2 = sugerirEscala([domManha], [funcoes[0]], [vs[0]], [], opcoes);
    expect(r2.atribuicoes[0].pessoaId).toBe("a");
  });

  it("faz rodízio: distribui o mês de forma equilibrada", () => {
    const eventos = [domManha, domNoite, qua, dom13];
    const r = sugerirEscala(eventos, funcoes, pessoas(6), [], opcoes);
    const cont: Record<string, number> = {};
    for (const a of r.atribuicoes) cont[a.pessoaId] = (cont[a.pessoaId] ?? 0) + 1;
    // 12 vagas para 6 pessoas = 2 para cada
    expect(Object.values(cont).every((n) => n === 2)).toBe(true);
  });

  it("evita a mesma pessoa de manhã e à noite no mesmo dia", () => {
    const r = sugerirEscala([domManha, domNoite], funcoes, pessoas(6), [], opcoes);
    const manha = new Set(r.atribuicoes.filter((a) => a.eventoId === "dom06m").map((a) => a.pessoaId));
    const noite = r.atribuicoes.filter((a) => a.eventoId === "dom06n").map((a) => a.pessoaId);
    expect(noite.some((p) => manha.has(p))).toBe(false);
  });

  it("prioriza quem serviu menos nos últimos 90 dias", () => {
    const vs: VoluntarioEntrada[] = [
      { id: "muito", nome: "A", funcoesAptas: ["dtv"], historico: ["2026-10-04T18:30:00-03:00", "2026-11-01T18:30:00-03:00"] },
      { id: "pouco", nome: "B", funcoesAptas: ["dtv"] },
    ];
    expect(sugerirEscala([dom13], [funcoes[0]], vs, [], opcoes).atribuicoes[0].pessoaId).toBe("pouco");
  });

  it("não mexe em vagas já preenchidas e não repete quem já está no evento", () => {
    const r = sugerirEscala([dom13], funcoes, pessoas(4), [{ eventoId: "dom13n", funcaoId: "dtv", pessoaId: "p0" }], opcoes);
    expect(r.atribuicoes.map((a) => a.funcaoId).sort()).toEqual(["black", "grua"]);
    expect(r.atribuicoes.some((a) => a.pessoaId === "p0")).toBe(false);
  });

  it("respeita escala em outro ministério no mesmo evento", () => {
    const r = sugerirEscala([dom13], [funcoes[0]], pessoas(2), [{ eventoId: "dom13n", pessoaId: "p0" }], opcoes);
    expect(r.atribuicoes[0].pessoaId).toBe("p1");
  });

  it("respeita limite de serviços por mês", () => {
    const r = sugerirEscala([domNoite, qua, dom13], [funcoes[0]], pessoas(1), [], { ...opcoes, limitePorMes: 2 });
    expect(r.atribuicoes).toHaveLength(2);
    expect(r.vagasSemCandidato).toHaveLength(1);
  });
});
