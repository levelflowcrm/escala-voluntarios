import { writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { Ficha } from "./metricas";
import { limparTextoPdf } from "./relatorio-ia";
import { montarRelatorio } from "./relatorio-metricas";
import { gerarPdf, seguro } from "./relatorio-pdf";

const DIA = 86_400_000;
const AREAS = [{ id: "a1", nome: "First" }, { id: "a2", nome: "Louvor" }, { id: "a3", nome: "Cozinha" }];

/** Cultos de domingo (20h) e quarta, de jan a nov de 2026, com números que crescem aos poucos. */
function fichas(): Ficha[] {
  const lista: Ficha[] = [];
  const inicio = Date.UTC(2026, 0, 4, 23); // domingo 20h em SP
  for (let i = 0; i < 48; i++) {
    const t = inicio + Math.floor(i / 2) * 7 * DIA + (i % 2) * 3 * DIA;
    if (t > Date.UTC(2026, 10, 26)) break;
    const dom = i % 2 === 0;
    lista.push({
      id: `e${i}`, titulo: dom ? "Culto de Domingo" : "Culto de Quarta", inicio: new Date(t).toISOString(),
      tipoId: dom ? "t1" : "t2", tipoNome: dom ? "Culto de Domingo" : "Culto de Quarta", contado: i % 11 !== 5,
      online: 300 + i * 6, visitantes: 8 + (i % 7), simPraJesus: 2 + (i % 5),
      naveVazias: 700 - i * 4, galeriaVazias: 300, carros: 120, motos: 40,
      areas: { a1: 12, a2: 10, a3: 6 }, autoEscalados: 40, autoPresentes: 35,
    });
  }
  return lista;
}

describe("relatório do culto", () => {
  const todas = fichas();
  const alvo = todas[todas.length - 2];

  it("monta o dia, a comparação, os 90 dias e os 12 meses", () => {
    const r = montarRelatorio(todas, alvo.id, 2055, AREAS)!;
    expect(r.dia.contado).toBe(true);
    expect(r.dia.presentes).toBe(2055 - alvo.naveVazias! - 300);
    expect(r.comparacao.anteriores).toHaveLength(6);
    expect(r.comparacao.base).toContain("mesmo tipo");
    expect(r.comparacao.anteriores.every((l) => l.titulo === alvo.titulo)).toBe(true);
    expect(r.comparacao.anteriores[0].inicio > r.comparacao.anteriores[5].inicio).toBe(true);
    expect(r.dias90.semanas).toHaveLength(13);
    expect(r.ano.meses).toHaveLength(12);
    expect(r.ano.ano).toBe(2026);
    expect(r.ano.meses[0].cultos).toBeGreaterThan(0);
    expect(r.ano.meses[11].cultos).toBe(0); // dezembro ainda não aconteceu
    expect(r.dia.areas.map((a) => a.nome)).toEqual(["First", "Louvor", "Cozinha"]);
  });

  it("sem culto anterior do mesmo tipo, compara com todos os eventos", () => {
    const so = todas.filter((f) => f.id === alvo.id || f.tipoId !== alvo.tipoId);
    const r = montarRelatorio(so, alvo.id, 2055, AREAS)!;
    expect(r.comparacao.base).toBe("eventos anteriores");
  });

  it("devolve null para evento que não está na lista", () => {
    expect(montarRelatorio(todas, "nao-existe", 2055, AREAS)).toBeNull();
  });

  it("gera um PDF de 4 páginas, com e sem análise", async () => {
    const r = montarRelatorio(todas, alvo.id, 2055, AREAS)!;
    const meta = { titulo: "Culto de Domingo 🙌", inicio: alvo.inicio, dataTexto: "Domingo, 22 de novembro às 20:00", geradoEm: new Date() };
    const analise = limparTextoPdf("Leitura do dia: o público ficou **acima** da média dos últimos cultos.\n\nTendência: crescimento constante.\n\nAtenção: faltou a contagem de alguns cultos.");
    const com = await gerarPdf(r, { ...meta, analise });
    const sem = await gerarPdf(r, { ...meta, analise: null });
    expect(Buffer.from(com.slice(0, 5)).toString()).toBe("%PDF-");
    expect((await PDFDocument.load(com)).getPageCount()).toBe(4);
    expect(sem.length).toBeGreaterThan(1000);
    if (process.env.SALVAR_PDF_TESTE) writeFileSync(process.env.SALVAR_PDF_TESTE, com);
  });

  it("limpa texto que a fonte do PDF não desenha", () => {
    expect(seguro("Culto 🙌 de “Domingo”")).toBe('Culto de "Domingo"');
    expect(limparTextoPdf("**Atenção:** ação")).toBe("Atenção: ação");
  });
});
