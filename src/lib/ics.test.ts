import { describe, expect, it } from "vitest";
import { linkGoogleAgenda, montarIcs } from "./ics";

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

describe("linkGoogleAgenda", () => {
  const url = linkGoogleAgenda({ titulo: "Servir: Culto & Louvor", inicio: "2026-11-18T22:30:00Z", descricao: "Transmissão\nChegar 18h", local: "Templo" });
  it("aponta para o Google Agenda com datas em UTC e duração padrão de 2h30", () => {
    expect(url.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE")).toBe(true);
    expect(url).toContain("dates=20261118T223000Z/20261119T010000Z");
    expect(url).toContain("ctz=America%2FSao_Paulo");
  });
  it("codifica título, detalhes e local", () => {
    expect(url).toContain("text=Servir%3A%20Culto%20%26%20Louvor");
    expect(url).toContain("details=Transmiss%C3%A3o%0AChegar%2018h");
    expect(url).toContain("location=Templo");
  });
  it("omite detalhes e local quando não há", () => {
    const u = linkGoogleAgenda({ titulo: "X", inicio: "2026-11-18T22:30:00Z", duracaoMin: 60 });
    expect(u).not.toContain("details=");
    expect(u).not.toContain("location=");
    expect(u).toContain("dates=20261118T223000Z/20261118T233000Z");
  });
});
