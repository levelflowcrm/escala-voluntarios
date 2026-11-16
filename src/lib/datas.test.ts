import { describe, expect, it } from "vitest";
import { diasAte, fmtDataHora } from "./datas";

describe("diasAte", () => {
  const agora = new Date("2026-11-16T15:00:00Z"); // 12h em Brasília
  it("conta por dia de calendário no fuso da igreja", () => {
    expect(diasAte("2026-11-16T23:00:00Z", agora)).toBe(0); // 20h do mesmo dia
    expect(diasAte("2026-11-17T01:00:00Z", agora)).toBe(0); // 22h de 16/11 em Brasília
    expect(diasAte("2026-11-17T12:00:00Z", agora)).toBe(1);
    expect(diasAte("2026-11-23T12:00:00Z", agora)).toBe(7);
  });
});

describe("fmtDataHora", () => {
  it("usa o dia da semana por extenso", () => {
    expect(fmtDataHora.format(new Date("2026-11-18T22:30:00Z"))).toBe("Quarta · 18/11 · 19:30");
  });
});
