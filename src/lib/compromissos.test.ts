import { describe, expect, it } from "vitest";
import { ehLink, rotuloCompromisso, validarCompromisso } from "./compromissos";

const agora = new Date("2026-11-21T12:00:00-03:00");

describe("validarCompromisso", () => {
  it("monta o início no fuso de São Paulo", () => {
    const r = validarCompromisso({ tipo: "ensaio", dia: "2026-11-28", hora: "15:30", local: "  Templo  " }, agora);
    expect(r).toEqual({ inicio: "2026-11-28T15:30:00-03:00", local: "Templo", observacao: null });
  });

  it("recusa tipo fora da lista, data ou hora inválidas", () => {
    expect(validarCompromisso({ tipo: "culto", dia: "2026-11-28", hora: "15:30" }, agora)).toEqual({ erro: "Escolha o tipo do compromisso" });
    expect(validarCompromisso({ tipo: "ensaio", dia: "", hora: "15:30" }, agora)).toEqual({ erro: "Escolha a data" });
    expect(validarCompromisso({ tipo: "ensaio", dia: "2026-11-28", hora: "25:00" }, agora)).toEqual({ erro: "Escolha o horário" });
  });

  it("não deixa marcar no passado nem a mais de 1 ano", () => {
    expect(validarCompromisso({ tipo: "ensaio", dia: "2026-11-21", hora: "11:00" }, agora)).toEqual({ erro: "Esse horário já passou" });
    expect(validarCompromisso({ tipo: "ensaio", dia: "2028-01-10", hora: "10:00" }, agora)).toEqual({ erro: "Marque com no máximo 1 ano de antecedência" });
  });
});

describe("rótulos e links", () => {
  it("traduz o tipo e reconhece link de reunião on-line", () => {
    expect(rotuloCompromisso("reuniao_online").texto).toBe("Reunião on-line");
    expect(ehLink("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(ehLink("Sala 2 do templo")).toBe(false);
  });
});
