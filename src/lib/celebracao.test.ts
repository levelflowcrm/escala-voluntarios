import { describe, expect, it } from "vitest";
import { montarCelebracao } from "./celebracao";

describe("montarCelebracao", () => {
  it("chegada no horário: +3, usa só o primeiro nome e fala do próximo nível", () => {
    const c = montarCelebracao("chegada", "Duarte Silva", 27);
    expect(c.tom).toBe("ganho");
    expect(c.pontos).toBe(3);
    expect(c.titulo).toBe("Pontualidade nota 10, Duarte!");
    expect(c.texto).toContain("+3 pontos");
    // 27 + 3 = 30 já é Plantinha; o próximo é Arbusto, a 40 pontos
    expect(c.nivel).toContain("Faltam 40 pontos para Arbusto");
  });
  it("assumir vaga e cobrir colega valem +8", () => {
    expect(montarCelebracao("assumiu", "Duarte", 0).pontos).toBe(8);
    expect(montarCelebracao("cobriu", "Duarte", 0).pontos).toBe(8);
  });
  it("recusa: tom acolhedor, mostra a perda medida e promete recuperar", () => {
    const c = montarCelebracao("recusou", "Duarte", 36, -4);
    expect(c.tom).toBe("perda");
    expect(c.pontos).toBe(-4);
    expect(c.texto).toContain("−4 pontos");
    expect(c.texto).toContain("vamos recuperar");
    expect(c.titulo).toBe("Obrigado por avisar, Duarte");
    expect(`${c.titulo} ${c.texto}`.toLowerCase()).not.toMatch(/punição|culpa|erro/);
  });
  it("recusa com pontuação já no zero não promete desconto", () => {
    const c = montarCelebracao("recusou", "Duarte", 0, 0);
    expect(c.pontos).toBeNull();
    expect(c.texto).not.toContain("pontos por não poder");
  });
  it("recuperação ao confirmar de novo mostra os pontos recuperados", () => {
    const c = montarCelebracao("recuperou", "Duarte", 40, 4);
    expect(c.tom).toBe("ganho");
    expect(c.pontos).toBe(4);
    expect(c.texto).toContain("+4 pontos");
  });
  it("no nível mais alto não fala de próximo nível", () => {
    expect(montarCelebracao("cobriu", "Duarte", 300).nivel).toContain("nível mais alto");
  });
  it("sem nome usa um tratamento neutro", () => {
    expect(montarCelebracao("assumiu", " ", 0).titulo).toContain("voluntário");
  });
});
