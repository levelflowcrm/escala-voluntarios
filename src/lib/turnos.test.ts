import { describe, expect, it } from "vitest";
import { nomeTurno, periodoDaHora, turnosDosCultos } from "./turnos";

describe("turnos", () => {
  it("período pela hora", () => {
    expect(periodoDaHora("09:00:00")).toBe("manha");
    expect(periodoDaHora("15:00")).toBe("tarde");
    expect(periodoDaHora("19:30:00")).toBe("noite");
  });
  it("turnos dos cultos fixos, de quarta a domingo", () => {
    const t = turnosDosCultos([
      { nome: "Domingo Noite", dia_semana: 0, hora: "18:30:00" },
      { nome: "Quarta", dia_semana: 3, hora: "19:30:00" },
      { nome: "Domingo Manhã", dia_semana: 0, hora: "09:00:00" },
      { nome: "Especial", dia_semana: null, hora: null },
    ]);
    expect(t.map(nomeTurno)).toEqual(["Quarta à noite", "Domingo de manhã", "Domingo à noite"]);
  });
});
