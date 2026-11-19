import { describe, expect, it } from "vitest";
import { lerNumero, mediaPorArea, ocupacao, periodoValido, presentes, resumir, variacao, voluntariosManual, veiculos, type Ficha } from "./metricas";

const base: Ficha = {
  id: "e", titulo: "Culto", inicio: "2026-11-15T22:00:00Z", tipoId: null, tipoNome: null, contado: true,
  online: null, visitantes: null, simPraJesus: null, naveVazias: null, galeriaVazias: null, carros: null, motos: null,
  areas: {}, autoEscalados: null, autoPresentes: null,
};
const f = (o: Partial<Ficha>): Ficha => ({ ...base, ...o });

describe("presentes", () => {
  it("= 2055 - vazias da Nave - vazias da Galeria", () => expect(presentes({ naveVazias: 400, galeriaVazias: 155 })).toBe(1500));
  it("sem os dois setores contados não há resultado", () => {
    expect(presentes({ naveVazias: 400, galeriaVazias: null })).toBeNull();
    expect(presentes({ naveVazias: null, galeriaVazias: null })).toBeNull();
  });
  it("zero vazias = casa cheia", () => expect(presentes({ naveVazias: 0, galeriaVazias: 0 })).toBe(2055));
  it("ocupação em %", () => expect(ocupacao(1500)).toBe(73));
});

describe("voluntários e veículos", () => {
  it("manual soma as áreas; sem área contada é nulo", () => {
    expect(voluntariosManual({ areas: { a: 12, b: 5 } })).toBe(17);
    expect(voluntariosManual({ areas: {} })).toBeNull();
  });
  it("veículos soma carros e motos; um lado em branco vale 0", () => {
    expect(veiculos({ carros: 210, motos: 64 })).toBe(274);
    expect(veiculos({ carros: 10, motos: null })).toBe(10);
    expect(veiculos({ carros: null, motos: null })).toBeNull();
  });
});

describe("resumir", () => {
  const lista = [
    f({ id: "1", naveVazias: 400, galeriaVazias: 155, online: 300, visitantes: 10, simPraJesus: 5, carros: 200, motos: 60, areas: { a: 100, b: 50 }, autoPresentes: 120 }),
    f({ id: "2", naveVazias: 800, galeriaVazias: 255, online: 500, visitantes: 20, simPraJesus: 0, carros: 100, motos: 40, areas: { a: 80 }, autoPresentes: 0 }),
    f({ id: "3", contado: false }),
  ];
  const r = resumir(lista);
  it("médias ignoram o que não foi contado", () => {
    expect(r.eventos).toBe(3);
    expect(r.contados).toBe(2);
    expect(r.presentesMedia).toBe(1250); // (1500 + 1000) / 2
    expect(r.onlineMedia).toBe(400);
    expect(r.carrosMedia).toBe(150);
    expect(r.motosMedia).toBe(50);
  });
  it("totais e maior público", () => {
    expect(r.visitantesTotal).toBe(30);
    expect(r.simPraJesusTotal).toBe(5);
    expect(r.presentesTotal).toBe(2500);
    expect(r.cultosComPublico).toBe(2);
    expect(r.onlineTotal).toBe(800);
    expect(r.presentesMax?.valor).toBe(1500);
    expect(r.ocupacaoMedia).toBe(60.8);
  });
  it("auto ignora eventos sem nenhum Cheguei; manual compara com presentes", () => {
    expect(r.voluntariosAutoMedia).toBe(120);
    expect(r.voluntariosManualMedia).toBe(115);
    expect(r.voluntariosPor100).toBe(9.2); // 230 / 2500
  });
  it("lista vazia não quebra", () => {
    const v = resumir([]);
    expect(v.presentesMedia).toBeNull();
    expect(v.visitantesTotal).toBeNull(); // nada contado: traço, não zero
    expect(v.simPraJesusTotal).toBeNull();
    expect(v.presentesMax).toBeNull();
  });
});

describe("variacao, áreas, período e número", () => {
  it("variação %", () => {
    expect(variacao(110, 100)).toBe(10);
    expect(variacao(90, 100)).toBe(-10);
    expect(variacao(5, 0)).toBeNull();
    expect(variacao(null, 100)).toBeNull();
  });
  it("média por área só conta quando a área foi contada", () => {
    const m = mediaPorArea([f({ areas: { a: 10 } }), f({ areas: { a: 20, b: 4 } })], [{ id: "a", nome: "Louvor" }, { id: "b", nome: "Cozinha" }, { id: "c", nome: "Mídia" }]);
    expect(m[0]).toMatchObject({ media: 15, vezes: 2 });
    expect(m[1]).toMatchObject({ media: 4, vezes: 1 });
    expect(m[2]).toMatchObject({ media: null, vezes: 0 });
  });
  it("período inválido volta para 90", () => {
    expect(periodoValido("30")).toBe(30);
    expect(periodoValido("7")).toBe(90);
    expect(periodoValido(undefined)).toBe(90);
  });
  it("lerNumero: vazio = não contado; letras e negativos são erro", () => {
    expect(lerNumero("")).toEqual({ valor: null, erro: false });
    expect(lerNumero(" 42 ")).toEqual({ valor: 42, erro: false });
    expect(lerNumero("-3").erro).toBe(true);
    expect(lerNumero("1,5").erro).toBe(true);
    expect(lerNumero("abc").erro).toBe(true);
  });
});
