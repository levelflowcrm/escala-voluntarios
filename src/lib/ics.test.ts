import { describe, expect, it } from "vitest";
import { montarIcs } from "./ics";

describe("montarIcs", () => {
  const ics = montarIcs({
    id: "abc",
    titulo: "Servir: Culto, Quarta; Câmera",
    inicio: "2026-11-18T22:30:00Z",
    descricao: "Transmissão\nChegar 18h",
    agora: new Date("2026-11-16T12:00:00Z"),
  });
  it("tem as datas em UTC e a duração padrão de 2h30", () => {
    expect(ics).toContain("DTSTART:20261118T223000Z");
    expect(ics).toContain("DTEND:20261119T010000Z");
  });
  it("escapa vírgula, ponto e vírgula e quebra de linha", () => {
    expect(ics).toContain("SUMMARY:Servir: Culto\\, Quarta\; Câmera");
    expect(ics).toContain("DESCRIPTION:Transmissão\\nChegar 18h");
  });
  it("usa quebras CRLF e avisa 2h antes", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("TRIGGER:-PT2H");
  });
});
